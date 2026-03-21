import { createActor } from "xstate";
import { prisma } from "@/db.server";
import { env } from "@/env";
import type {
	AssignmentStatus,
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import { activityDetail } from "@/lib/activity-log";
import { logActivity } from "@/lib/server/activity-log";
import { sendEmail } from "@/lib/server/email";
import type { SubmissionTypeConfig } from "@/lib/settings/types";
import { SUBMISSION_TYPE_TO_KEY } from "@/lib/settings/types";
import {
	type AssignmentEvent,
	assignmentMachine,
	getAutoTransitionEvent,
	getTransitionDescription,
	type SubmissionContext,
	type SubmissionEvent,
	submissionMachine,
	type TransitionResult,
} from "@/lib/workflow";
import { logger } from "@/logger.ts";
import { getSetting } from "./settings.server";

/**
 * Get submission type config for a submission
 */
async function getSubmissionConfig(
	submissionType: SubmissionType,
): Promise<SubmissionTypeConfig> {
	const key = SUBMISSION_TYPE_TO_KEY[submissionType];
	return getSetting(key);
}

/**
 * Build xstate context from submission data
 */
async function buildSubmissionContext(
	submissionId: string,
): Promise<SubmissionContext> {
	// Fetch submission with assignments, then filter by currentRound
	const submissionWithRelations = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
		include: {
			reviewAssignments: true,
		},
	});

	// Filter to current round in memory
	const currentRound = submissionWithRelations.currentRound;
	const submission = {
		...submissionWithRelations,
		reviewAssignments: submissionWithRelations.reviewAssignments.filter(
			(a) => a.round === currentRound && a.status !== "CANCELLED",
		),
	};

	const config = await getSubmissionConfig(submission.type);

	const assignedReviewersCount = submission.reviewAssignments.length;
	const completedReviewsCount = submission.reviewAssignments.filter(
		(a) => a.status === "COMPLETED",
	).length;

	return {
		submissionId,
		submissionType: submission.type,
		currentRound: submission.currentRound,
		requiresEditorDecision: config.requiresEditorDecision,
		autoTransitionAfterReviews: config.autoTransitionAfterReviews ?? true,
		minReviewers: config.minReviewers,
		maxReviewers: config.maxReviewers,
		assignedReviewersCount,
		completedReviewsCount,
	};
}

/**
 * Validate and execute a submission workflow transition
 */
export async function executeSubmissionTransition(
	submissionId: string,
	event: SubmissionEvent,
	triggeredBy?: string,
	reason?: string,
): Promise<TransitionResult> {
	const submission = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
	});

	const context = await buildSubmissionContext(submissionId);

	// Create actor with current state
	const actor = createActor(submissionMachine, {
		snapshot: submissionMachine.resolveState({
			value: submission.status,
			context,
		}),
	});

	actor.start();

	// Check if transition is valid using xstate v5 API
	const currentSnapshot = actor.getSnapshot();

	// Check if the event can be sent from current state
	if (!currentSnapshot.can(event)) {
		actor.stop();
		logger.warn(
			`[workflow] invalid submission transition: ${event.type} from ${submission.status} (${submissionId})`,
		);
		return {
			success: false,
			fromState: submission.status,
			toState: submission.status,
			event: event.type,
			error: `Invalid transition: ${event.type} from ${submission.status}`,
		};
	}

	// Send the event to get the next state
	actor.send(event);
	const nextSnapshot = actor.getSnapshot();
	const newState = String(nextSnapshot.value) as SubmissionStatus;

	// Execute transition in database
	await prisma.$transaction(async (tx) => {
		// Update submission status
		const updateData: { status: SubmissionStatus; currentRound?: number } = {
			status: newState,
		};

		// Handle round increment for RESUBMIT
		if (event.type === "RESUBMIT") {
			updateData.currentRound = submission.currentRound + 1;
		}

		await tx.submission.update({
			where: { id: submissionId },
			data: updateData,
		});

		// Create status history entry
		const description = getTransitionDescription(
			submission.status,
			newState,
			event.type,
		);

		await tx.activityLog.create({
			data: {
				type: "SUBMISSION_STATUS_CHANGED",
				submissionId,
				performedBy: triggeredBy,
				detail: {
					type: "SUBMISSION_STATUS_CHANGED",
					fromStatus: submission.status,
					toStatus: newState,
					round:
						event.type === "RESUBMIT"
							? submission.currentRound + 1
							: submission.currentRound,
					event: event.type,
					reason: reason || description,
				},
			},
		});
	});

	actor.stop();

	logger.info(
		`[workflow] submission ${submissionId}: ${submission.status} → ${newState} (${event.type})`,
	);

	return {
		success: true,
		fromState: submission.status,
		toState: newState,
		event: event.type,
	};
}

/**
 * Validate a submission transition without executing it.
 * Used when custom DB work (e.g., version creation) must be atomic with the status change.
 */
export async function validateSubmissionTransition(
	submissionId: string,
	event: SubmissionEvent,
): Promise<{ valid: boolean; error?: string }> {
	const submission = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
	});

	const context = await buildSubmissionContext(submissionId);

	const actor = createActor(submissionMachine, {
		snapshot: submissionMachine.resolveState({
			value: submission.status,
			context,
		}),
	});

	actor.start();
	const valid = actor.getSnapshot().can(event);
	actor.stop();

	return valid
		? { valid: true }
		: {
				valid: false,
				error: `Invalid transition: ${event.type} from ${submission.status}`,
			};
}

/**
 * Get valid events for a submission in current state
 */
export async function getValidSubmissionEvents(
	submissionId: string,
): Promise<string[]> {
	const submission = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
	});

	const context = await buildSubmissionContext(submissionId);

	const actor = createActor(submissionMachine, {
		snapshot: submissionMachine.resolveState({
			value: submission.status,
			context,
		}),
	});

	actor.start();
	const snapshot = actor.getSnapshot();
	actor.stop();

	// In xstate v5, check which events can be sent using snapshot.can()
	const allEvents = [
		"SUBMIT",
		"ASSIGN_REVIEWER",
		"WITHDRAW",
		"DESK_REJECT",
		"ALL_REVIEWS_COMPLETE",
		"MANUAL_TRANSITION_TO_REVIEWS_COMPLETE",
		"MANUAL_TRANSITION_TO_AWAITING_DECISION",
		"EDITOR_ACCEPT",
		"EDITOR_CONDITIONAL",
		"EDITOR_REVISE",
		"EDITOR_REJECT",
		"EDITOR_OVERRIDE",
		"CONFIRM_CONDITIONS_MET",
		"RESUBMIT",
	] as const;

	return allEvents.filter((eventType) =>
		snapshot.can({ type: eventType } as SubmissionEvent),
	);
}

/**
 * Execute assignment status transition
 */
export async function executeAssignmentTransition(
	assignmentId: string,
	event: AssignmentEvent,
	_triggeredBy?: string,
): Promise<TransitionResult> {
	const assignment = await prisma.reviewAssignment.findUniqueOrThrow({
		where: { id: assignmentId },
	});

	const actor = createActor(assignmentMachine, {
		snapshot: assignmentMachine.resolveState({
			value: assignment.status,
			context: {
				assignmentId,
				submissionId: assignment.submissionId,
				reviewerId: assignment.reviewerId,
				round: assignment.round,
				deadline: assignment.deadline ?? undefined,
			},
		}),
	});

	actor.start();

	const currentSnapshot = actor.getSnapshot();

	// Check if transition is valid using xstate v5 API
	if (!currentSnapshot.can(event)) {
		actor.stop();
		logger.warn(
			`[workflow] invalid assignment transition: ${event.type} from ${assignment.status} (${assignmentId})`,
		);
		return {
			success: false,
			fromState: assignment.status,
			toState: assignment.status,
			event: event.type,
			error: `Invalid transition: ${event.type} from ${assignment.status}`,
		};
	}

	// Send the event to get the next state
	actor.send(event);
	const nextSnapshot = actor.getSnapshot();
	const newState = String(nextSnapshot.value) as AssignmentStatus;

	// Update assignment in database
	const updateData: {
		status: AssignmentStatus;
		startedAt?: Date;
		completedAt?: Date;
		cancelledAt?: Date;
	} = { status: newState };

	if (event.type === "START_REVIEW") {
		updateData.startedAt = new Date();
	} else if (event.type === "COMPLETE") {
		updateData.completedAt = new Date();
	} else if (event.type === "CANCEL") {
		updateData.cancelledAt = new Date();
	}

	await prisma.reviewAssignment.update({
		where: { id: assignmentId },
		data: updateData,
	});

	actor.stop();

	logger.info(
		`[workflow] assignment ${assignmentId}: ${assignment.status} → ${newState} (${event.type})`,
	);

	return {
		success: true,
		fromState: assignment.status,
		toState: newState,
		event: event.type,
	};
}

/**
 * Check if all reviews are complete and trigger auto-transition if configured
 */
export async function checkAndTriggerReviewCompletion(
	submissionId: string,
	triggeredBy?: string,
): Promise<TransitionResult | null> {
	// Fetch submission with all related data and filter by currentRound in memory
	const submissionWithRelations = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
		include: {
			reviewAssignments: true,
			reviews: {
				orderBy: { createdAt: "desc" },
			},
		},
	});

	const currentRound = submissionWithRelations.currentRound;
	const submission = {
		...submissionWithRelations,
		reviewAssignments: submissionWithRelations.reviewAssignments.filter(
			(a) => a.round === currentRound && a.status !== "CANCELLED",
		),
		reviews: submissionWithRelations.reviews.filter(
			(r) => r.round === currentRound,
		),
	};

	// Only trigger from UNDER_REVIEW
	if (submission.status !== "UNDER_REVIEW") {
		return null;
	}

	const config = await getSubmissionConfig(submission.type);

	const assignedCount = submission.reviewAssignments.length;
	const completedCount = submission.reviewAssignments.filter(
		(a) => a.status === "COMPLETED",
	).length;

	// Check if all reviews are complete
	if (completedCount < assignedCount || assignedCount < config.minReviewers) {
		return null;
	}

	// Auto-transition if configured
	if (config.autoTransitionAfterReviews || !config.requiresEditorDecision) {
		logger.info(
			`[workflow] all reviews complete for submission ${submissionId}, auto-transitioning`,
		);
		const result = await executeSubmissionTransition(
			submissionId,
			{ type: "ALL_REVIEWS_COMPLETE" },
			triggeredBy,
			"All reviews completed - auto-transition",
		);

		if (result.success) {
			// Notify the editor who assigned reviewers
			const assignerIds = [
				...new Set(
					submission.reviewAssignments
						.map((a) => a.assignedBy)
						.filter((id): id is string => id !== null),
				),
			];

			if (assignerIds.length > 0) {
				const editors = await prisma.user.findMany({
					where: { id: { in: assignerIds } },
					select: { email: true },
				});

				for (const editor of editors) {
					void sendEmail("ALL_REVIEWS_COMPLETE", editor.email, {
						submissionTitle: submission.title,
						submissionUrl: `${env.APP_BASE_URL}/admin/submissions/${submissionId}`,
					});
				}
			}
		}

		// For types with editor decision, auto-transition to AWAITING_DECISION
		if (result.success && config.requiresEditorDecision) {
			await executeSubmissionTransition(
				submissionId,
				{ type: "MANUAL_TRANSITION_TO_AWAITING_DECISION" },
				triggeredBy,
				"Auto-transitioned to awaiting decision after reviews complete",
			);
		}

		// For types without editor decision, auto-apply only if reviewers are unanimous
		if (result.success && !config.requiresEditorDecision) {
			const decisions = submission.reviews.map((r) => r.decision);
			if (decisions.length > 0) {
				const unanimous = decisions.every((d) => d === decisions[0]);
				if (unanimous) {
					const autoEvent = getAutoTransitionEvent(decisions[0]);
					const autoResult = await executeSubmissionTransition(
						submissionId,
						{ type: autoEvent },
						triggeredBy,
						`Auto-applied unanimous reviewer decision: ${decisions[0]}`,
					);

					// Send decision email to author after auto-apply
					if (autoResult.success) {
						const decisionEmailMap = {
							ACCEPT: "DECISION_ACCEPTED",
							ACCEPT_WITH_MINOR_REVISIONS: "DECISION_CONDITIONALLY_ACCEPTED",
							REVISE_AND_RESUBMIT: "DECISION_REVISE_REQUIRED",
							REJECT: "DECISION_REJECTED",
						} as const;

						const emailEvent = decisionEmailMap[decisions[0]];
						const presenter = await prisma.submissionAuthor.findFirst({
							where: { submissionId, isPresenter: true },
						});

						if (presenter) {
							void sendEmail(emailEvent, presenter.email, {
								authorName: `${presenter.firstName} ${presenter.lastName}`,
								submissionTitle: submission.title,
								letterToAuthor: `Reviewer decision: ${decisions[0]}`,
								submissionUrl: `${env.APP_BASE_URL}/submissions/${submissionId}`,
							});
						}
					}

					return autoResult;
				}
				logger.info(
					`[workflow] reviewers disagree for submission ${submissionId}, leaving at REVIEWS_COMPLETE for editor`,
				);
			}
		}

		return result;
	}

	return null;
}

/**
 * Withdraw a submission (author or admin/editor action)
 */
export async function withdrawSubmission(
	submissionId: string,
	userId: string,
	reason?: string,
): Promise<TransitionResult> {
	// Verify authorization: owner or admin/editor (co-authors can only view)
	const [submission, user] = await Promise.all([
		prisma.submission.findUniqueOrThrow({
			where: { id: submissionId },
			select: { userId: true },
		}),
		prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { role: true },
		}),
	]);

	const isOwner = submission.userId === userId;
	const isAdminOrEditor = user.role === "ADMIN" || user.role === "EDITOR";

	if (!isOwner && !isAdminOrEditor) {
		return {
			success: false,
			fromState: "",
			toState: "",
			event: "WITHDRAW",
			error: "Not authorized to withdraw this submission",
		};
	}

	const result = await executeSubmissionTransition(
		submissionId,
		{ type: "WITHDRAW" },
		userId,
		reason || "Author withdrew submission",
	);

	if (result.success) {
		await logActivity({
			type: "SUBMISSION_WITHDRAWN",
			submissionId,
			performedBy: userId,
			detail: activityDetail("SUBMISSION_WITHDRAWN", { reason }),
		});

		// Cancel all active reviewer assignments
		const activeAssignments = await prisma.reviewAssignment.findMany({
			where: {
				submissionId,
				status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] },
			},
		});

		for (const assignment of activeAssignments) {
			await executeAssignmentTransition(
				assignment.id,
				{ type: "CANCEL" },
				userId,
			);
		}

		// Send withdrawal notification to presenter and admins
		const submission = await prisma.submission.findUniqueOrThrow({
			where: { id: submissionId },
			include: {
				authors: { where: { isPresenter: true }, take: 1 },
			},
		});

		const presenter = submission.authors[0];
		if (presenter) {
			void sendEmail("SUBMISSION_WITHDRAWN", presenter.email, {
				authorName: `${presenter.firstName} ${presenter.lastName}`,
				submissionTitle: submission.title,
				submissionUrl: `${env.APP_BASE_URL}/submissions/${submissionId}`,
			});
		}

		// Notify admins
		const admins = await prisma.user.findMany({
			where: { role: { in: ["ADMIN", "EDITOR"] }, isActive: true },
			select: { email: true },
		});
		for (const admin of admins) {
			if (admin.email !== presenter?.email) {
				void sendEmail("SUBMISSION_WITHDRAWN", admin.email, {
					authorName: presenter
						? `${presenter.firstName} ${presenter.lastName}`
						: "Author",
					submissionTitle: submission.title,
					submissionUrl: `${env.APP_BASE_URL}/admin/submissions/${submissionId}`,
				});
			}
		}
	}

	return result;
}

/**
 * Desk reject a submission (editor action)
 */
export async function deskRejectSubmission(
	submissionId: string,
	editorId: string,
	reason: string,
): Promise<TransitionResult> {
	const result = await executeSubmissionTransition(
		submissionId,
		{ type: "DESK_REJECT", reason },
		editorId,
		reason,
	);

	if (result.success) {
		const submission = await prisma.submission.findUniqueOrThrow({
			where: { id: submissionId },
			include: {
				authors: { where: { isPresenter: true }, take: 1 },
			},
		});

		// Create editor decision record for audit trail
		await prisma.editorDecision.create({
			data: {
				submissionId,
				editorId,
				round: submission.currentRound,
				decision: "REJECT",
				reasoning: reason,
				letterToAuthor: reason,
				basedOnReviews: [],
			},
		});

		const presenter = submission.authors[0];
		if (presenter) {
			void sendEmail("DECISION_REJECTED", presenter.email, {
				authorName: `${presenter.firstName} ${presenter.lastName}`,
				submissionTitle: submission.title,
				letterToAuthor: reason,
				submissionUrl: `${env.APP_BASE_URL}/submissions/${submissionId}`,
			});
		}

		await logActivity({
			type: "DECISION_DESK_REJECT",
			submissionId,
			performedBy: editorId,
			detail: activityDetail("DECISION_DESK_REJECT", { reason }),
		});
	}

	return result;
}

/**
 * Submit editor decision
 */
export async function submitEditorDecision(
	submissionId: string,
	editorId: string,
	decision:
		| "ACCEPT"
		| "CONDITIONALLY_ACCEPT"
		| "REVISE_AND_RESUBMIT"
		| "REJECT",
	reasoning?: string,
	letterToAuthor?: string,
): Promise<TransitionResult> {
	// Fetch submission with all reviews and filter by currentRound in memory
	const submissionWithRelations = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
		include: {
			reviews: true,
		},
	});

	const submission = {
		...submissionWithRelations,
		reviews: submissionWithRelations.reviews.filter(
			(r) => r.round === submissionWithRelations.currentRound,
		),
	};

	// Map decision to event
	const eventMap = {
		ACCEPT: "EDITOR_ACCEPT",
		CONDITIONALLY_ACCEPT: "EDITOR_CONDITIONAL",
		REVISE_AND_RESUBMIT: "EDITOR_REVISE",
		REJECT: "EDITOR_REJECT",
	} as const;

	const event: SubmissionEvent = { type: eventMap[decision] };

	const result = await executeSubmissionTransition(
		submissionId,
		event,
		editorId,
		reasoning || `Editor decision: ${decision}`,
	);

	if (result.success) {
		// Create editor decision record only after successful transition
		await prisma.editorDecision.create({
			data: {
				submissionId,
				editorId,
				round: submission.currentRound,
				decision,
				reasoning,
				letterToAuthor,
				basedOnReviews: submission.reviews.map((r) => r.id),
			},
		});

		// Send decision email to author
		const decisionEmailMap = {
			ACCEPT: "DECISION_ACCEPTED",
			CONDITIONALLY_ACCEPT: "DECISION_CONDITIONALLY_ACCEPTED",
			REVISE_AND_RESUBMIT: "DECISION_REVISE_REQUIRED",
			REJECT: "DECISION_REJECTED",
		} as const;

		const emailEvent = decisionEmailMap[decision];
		const presenter = await prisma.submissionAuthor.findFirst({
			where: { submissionId, isPresenter: true },
		});

		if (presenter) {
			void sendEmail(emailEvent, presenter.email, {
				authorName: `${presenter.firstName} ${presenter.lastName}`,
				submissionTitle: submission.title,
				letterToAuthor: letterToAuthor ?? reasoning ?? "",
				submissionUrl: `${env.APP_BASE_URL}/submissions/${submissionId}`,
			});
		}

		await logActivity({
			type: "DECISION_SUBMITTED",
			submissionId,
			performedBy: editorId,
			detail: activityDetail("DECISION_SUBMITTED", {
				decision,
				reasoning,
			}),
		});
	}

	return result;
}

/**
 * Override editor decision (reopen from terminal state)
 */
export async function overrideDecision(
	submissionId: string,
	editorId: string,
	reasoning: string,
): Promise<TransitionResult> {
	const result = await executeSubmissionTransition(
		submissionId,
		{ type: "EDITOR_OVERRIDE" },
		editorId,
		reasoning,
	);

	if (result.success) {
		const submission = await prisma.submission.findUniqueOrThrow({
			where: { id: submissionId },
			include: {
				authors: { where: { isPresenter: true }, take: 1 },
			},
		});

		const presenter = submission.authors[0];
		if (presenter) {
			void sendEmail("DECISION_OVERRIDDEN", presenter.email, {
				authorName: `${presenter.firstName} ${presenter.lastName}`,
				submissionTitle: submission.title,
				previousDecision: result.fromState,
				submissionUrl: `${env.APP_BASE_URL}/submissions/${submissionId}`,
			});
		}

		await logActivity({
			type: "DECISION_OVERRIDE",
			submissionId,
			performedBy: editorId,
			detail: activityDetail("DECISION_OVERRIDE", { reasoning }),
		});
	}

	return result;
}

/**
 * Confirm conditions met — promote CONDITIONALLY_ACCEPTED to ACCEPTED
 */
export async function confirmConditionsMet(
	submissionId: string,
	editorId: string,
	reasoning: string,
): Promise<TransitionResult> {
	const result = await executeSubmissionTransition(
		submissionId,
		{ type: "CONFIRM_CONDITIONS_MET" },
		editorId,
		reasoning,
	);

	if (result.success) {
		const submission = await prisma.submission.findUniqueOrThrow({
			where: { id: submissionId },
			include: {
				authors: { where: { isPresenter: true }, take: 1 },
				reviews: {
					orderBy: { createdAt: "desc" },
				},
			},
		});

		// Create editor decision record
		const currentRoundReviews = submission.reviews.filter(
			(r) => r.round === submission.currentRound,
		);
		await prisma.editorDecision.create({
			data: {
				submissionId,
				editorId,
				round: submission.currentRound,
				decision: "ACCEPT",
				reasoning,
				basedOnReviews: currentRoundReviews.map((r) => r.id),
			},
		});

		// Send acceptance email to presenter
		const presenter = submission.authors[0];
		if (presenter) {
			void sendEmail("DECISION_ACCEPTED", presenter.email, {
				authorName: `${presenter.firstName} ${presenter.lastName}`,
				submissionTitle: submission.title,
				letterToAuthor: reasoning,
				submissionUrl: `${env.APP_BASE_URL}/submissions/${submissionId}`,
			});
		}

		await logActivity({
			type: "DECISION_SUBMITTED",
			submissionId,
			performedBy: editorId,
			detail: activityDetail("DECISION_SUBMITTED", {
				decision: "ACCEPT",
				reasoning,
			}),
		});
	}

	return result;
}
