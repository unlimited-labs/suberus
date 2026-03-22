import { prisma } from "@/db.server";
import { env } from "@/env.ts";
import type { ReviewDecision, ReviewMode } from "@/generated/prisma/enums";
import { activityDetail } from "@/lib/activity-log";
import { logActivity } from "@/lib/server/activity-log";
import { sendEmail } from "@/lib/server/email";
import { SUBMISSION_TYPE_TO_KEY } from "@/lib/settings/types";
import { getSetting } from "./settings.server";
import { checkAndTriggerReviewCompletion } from "./workflow.server";

/** Review submission data */
export interface ReviewSubmitData {
	decision: ReviewDecision;
	comments: string;
	privateNotes?: string;
	scores?: Record<string, number>;
	confidenceLevel?: number;
}

/** Get assignment details for review form */
export async function getAssignmentForReview(
	assignmentId: string,
	reviewerId: string,
): Promise<{
	assignment: {
		id: string;
		submissionId: string;
		round: number;
		status: string;
		deadline: Date | null;
	};
	submission: {
		id: string;
		title: string;
		content: string;
		type: string;
		authors: Array<{
			firstName: string;
			lastName: string;
			affiliationName: string | null;
			isPresenter: boolean;
		}>;
		file: {
			id: string;
			fileName: string;
			originalName: string;
			mimeType: string;
			size: number;
		} | null;
	};
	config: {
		reviewMode: ReviewMode;
		enableScoring: boolean;
		scoringCriteria: { name: string; description: string }[];
		enableConfidenceLevel: boolean;
	};
	existingReview?: {
		decision: ReviewDecision;
		comments: string | null;
		privateNotes: string | null;
		scores: Record<string, number> | null;
		confidenceLevel: number | null;
	};
} | null> {
	const assignment = await prisma.reviewAssignment.findUnique({
		where: { id: assignmentId },
		include: {
			submission: {
				include: {
					authors: {
						include: { affiliation: true },
						orderBy: { orderIndex: "asc" },
					},
					currentVersion: {
						include: {
							file: {
								select: {
									id: true,
									fileName: true,
									originalName: true,
									mimeType: true,
									size: true,
								},
							},
						},
					},
				},
			},
			review: true,
		},
	});

	if (!assignment) return null;

	// Verify reviewer ownership
	if (assignment.reviewerId !== reviewerId) return null;

	// Get config for submission type
	const configKey = SUBMISSION_TYPE_TO_KEY[assignment.submission.type];
	const config = await getSetting(configKey);

	return {
		assignment: {
			id: assignment.id,
			submissionId: assignment.submissionId,
			round: assignment.round,
			status: assignment.status,
			deadline: assignment.deadline,
		},
		submission: {
			id: assignment.submission.id,
			title: assignment.submission.title,
			content:
				assignment.submission.currentVersion?.content ??
				assignment.submission.content,
			type: assignment.submission.type,
			authors:
				config.reviewMode === "DOUBLE_BLIND"
					? []
					: assignment.submission.authors.map((a) => ({
							firstName: a.firstName,
							lastName: a.lastName,
							affiliationName: a.affiliation?.name ?? null,
							isPresenter: a.isPresenter,
						})),
			file: assignment.submission.currentVersion?.file ?? null,
		},
		config: {
			reviewMode: config.reviewMode,
			enableScoring: config.enableScoring,
			scoringCriteria: config.scoringCriteria,
			enableConfidenceLevel: config.enableConfidenceLevel,
		},
		existingReview: assignment.review
			? {
					decision: assignment.review.decision,
					comments: assignment.review.comments,
					privateNotes: assignment.review.privateNotes,
					scores: (assignment.review.scores as Record<string, number>) ?? null,
					confidenceLevel: assignment.review.confidenceLevel,
				}
			: undefined,
	};
}

/** Submit a review */
export async function submitReview(
	assignmentId: string,
	reviewerId: string,
	data: ReviewSubmitData,
): Promise<{ success: boolean; error?: string }> {
	const assignment = await prisma.reviewAssignment.findUnique({
		where: { id: assignmentId },
		include: {
			submission: true,
			review: true,
		},
	});

	if (!assignment) {
		return { success: false, error: "Assignment not found" };
	}

	if (assignment.reviewerId !== reviewerId) {
		return { success: false, error: "Not assigned to this reviewer" };
	}

	if (assignment.status === "CANCELLED") {
		return { success: false, error: "Assignment has been cancelled" };
	}

	if (assignment.status === "COMPLETED") {
		return { success: false, error: "Review already submitted" };
	}

	// Load config for server-side validation of scores/confidence
	const configKey = SUBMISSION_TYPE_TO_KEY[assignment.submission.type];
	const config = await getSetting(configKey);

	// Validate scores when scoring is enabled
	let validatedScores: Record<string, number> | undefined;
	if (config.enableScoring) {
		const criteriaNames = config.scoringCriteria.map(
			(c: { name: string }) => c.name,
		);
		if (!data.scores || criteriaNames.length === 0) {
			return {
				success: false,
				error: "Scores are required when scoring is enabled",
			};
		}
		for (const name of criteriaNames) {
			const score = data.scores[name];
			if (score === undefined || score < 1 || score > 5) {
				return {
					success: false,
					error: `Score for "${name}" is required (1-5)`,
				};
			}
		}
		const scores = data.scores;
		validatedScores = Object.fromEntries(
			criteriaNames.map((name) => [name, scores[name]]),
		);
	}

	// Validate confidence level when enabled
	let validatedConfidence: number | undefined;
	if (config.enableConfidenceLevel) {
		if (
			!data.confidenceLevel ||
			data.confidenceLevel < 1 ||
			data.confidenceLevel > 5
		) {
			return { success: false, error: "Confidence level is required (1-5)" };
		}
		validatedConfidence = data.confidenceLevel;
	}

	const reviewData = {
		decision: data.decision,
		comments: data.comments,
		privateNotes: data.privateNotes,
		scores: validatedScores,
		confidenceLevel: validatedConfidence,
	};

	// Atomic: review create/update + assignment completion in one transaction
	const now = new Date();

	await prisma.$transaction(async (tx) => {
		if (assignment.review) {
			await tx.review.update({
				where: { id: assignment.review.id },
				data: reviewData,
			});
		} else {
			await tx.review.create({
				data: {
					assignmentId,
					submissionId: assignment.submissionId,
					reviewerId,
					versionId: assignment.submission.currentVersionId,
					round: assignment.round,
					...reviewData,
				},
			});
		}

		await tx.reviewAssignment.update({
			where: { id: assignmentId },
			data: {
				status: "COMPLETED",
				completedAt: now,
			},
		});
	});

	// After transaction: trigger auto-transition if all reviews complete
	await checkAndTriggerReviewCompletion(assignment.submissionId, reviewerId);

	// Notify editor(s) that a review was submitted
	if (assignment.assignedBy) {
		const editor = await prisma.user.findUnique({
			where: { id: assignment.assignedBy },
			select: { email: true },
		});

		if (editor) {
			const reviewer = await prisma.user.findUniqueOrThrow({
				where: { id: reviewerId },
				select: { firstName: true, lastName: true, email: true },
			});

			void sendEmail("REVIEW_SUBMITTED", editor.email, {
				submissionTitle: assignment.submission.title,
				reviewerName:
					`${reviewer.firstName ?? ""} ${reviewer.lastName ?? ""}`.trim() ||
					reviewer.email,
				submissionUrl: `${env.APP_BASE_URL}/admin/submissions/${assignment.submissionId}`,
			});
		}
	}

	await logActivity({
		type: "REVIEW_SUBMITTED",
		submissionId: assignment.submissionId,
		userId: reviewerId,
		performedBy: reviewerId,
		detail: activityDetail("REVIEW_SUBMITTED", { decision: data.decision }),
	});

	return { success: true };
}

/** Get reviews for a submission (editor view) */
export async function getSubmissionReviews(
	submissionId: string,
	round?: number,
): Promise<
	Array<{
		id: string;
		reviewerName: string;
		reviewerEmail: string;
		round: number;
		decision: ReviewDecision;
		comments: string | null;
		privateNotes: string | null;
		scores: Record<string, number> | null;
		confidenceLevel: number | null;
		createdAt: Date;
	}>
> {
	const submission = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
		select: { currentRound: true },
	});

	const targetRound = round ?? submission.currentRound;

	const reviews = await prisma.review.findMany({
		where: { submissionId, round: targetRound },
		include: {
			reviewer: {
				select: { firstName: true, lastName: true, email: true },
			},
		},
		orderBy: { createdAt: "asc" },
	});

	return reviews.map((r) => ({
		id: r.id,
		reviewerName:
			`${r.reviewer.firstName ?? ""} ${r.reviewer.lastName ?? ""}`.trim() ||
			r.reviewer.email,
		reviewerEmail: r.reviewer.email,
		round: r.round,
		decision: r.decision,
		comments: r.comments,
		privateNotes: r.privateNotes,
		scores: (r.scores as Record<string, number>) ?? null,
		confidenceLevel: r.confidenceLevel,
		createdAt: r.createdAt,
	}));
}
