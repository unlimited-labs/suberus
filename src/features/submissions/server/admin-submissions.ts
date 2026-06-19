import { env } from "@/env";
import {
	logActivity,
	logActivityTx,
} from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { assignReviewer } from "@/features/reviews/server/assignments";
import { getSubmissionTypeConfigs } from "@/features/settings/server/settings";
import {
	type SubmissionTodo,
	statusChangeOptions,
} from "@/features/submissions/labels";
import type { SubmissionEvent } from "@/features/workflow";
import { hasMinReviewers } from "@/features/workflow/guards";
import { executeSubmissionTransition } from "@/features/workflow/server/workflow";
import type {
	EmailEventType,
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";
import { deleteFile } from "@/shared/server/storage";
import { decisionTypeFor } from "./bulk-decision-rules";

export interface SubmissionDeleteWarnings {
	warnings: string[];
}

export async function checkSubmissionDeleteWarnings(
	submissionId: string,
): Promise<SubmissionDeleteWarnings> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: {
			status: true,
			_count: {
				select: {
					reviews: true,
					reviewAssignments: true,
					editorDecisions: true,
				},
			},
		},
	});

	if (!submission) {
		throw new Response("Submission not found", { status: 404 });
	}

	const warnings: string[] = [];

	const activeStatuses: SubmissionStatus[] = [
		"UNDER_REVIEW",
		"REVIEWS_COMPLETE",
		"AWAITING_DECISION",
	];
	if (activeStatuses.includes(submission.status)) {
		warnings.push("Submission is in an active review process");
	}

	if (submission._count.reviewAssignments > 0) {
		warnings.push(
			`${submission._count.reviewAssignments} reviewer assignment(s) will be deleted`,
		);
	}

	if (submission._count.reviews > 0) {
		warnings.push(
			`${submission._count.reviews} review(s) will be permanently lost`,
		);
	}

	if (submission._count.editorDecisions > 0) {
		warnings.push(
			`${submission._count.editorDecisions} editor decision(s) will be permanently lost`,
		);
	}

	return { warnings };
}

export async function deleteSubmission(
	submissionId: string,
	performedBy: string,
): Promise<{ success: boolean }> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: {
			id: true,
			title: true,
			sequentialNumber: true,
			userId: true,
			versions: {
				select: { file: { select: { id: true, storageKey: true } } },
			},
			reviews: {
				select: { id: true },
			},
		},
	});

	if (!submission) {
		throw new Response("Submission not found", { status: 404 });
	}

	// Collect file storage keys for cleanup after transaction
	const versionFileKeys = submission.versions
		.map((v) => v.file)
		.filter((f): f is { id: string; storageKey: string } => f !== null);

	// Also collect review attachment files
	const reviewIds = submission.reviews.map((r) => r.id);
	const reviewFiles =
		reviewIds.length > 0
			? await prisma.file.findMany({
					where: { entityType: "REVIEW", entityId: { in: reviewIds } },
					select: { id: true, storageKey: true },
				})
			: [];

	const fileKeys = [...versionFileKeys, ...reviewFiles];

	await prisma.$transaction(async (tx) => {
		// Log deletion as a user-level activity (no submissionId — it's being deleted)
		await logActivityTx(tx, {
			type: "SUBMISSION_DELETED",
			userId: submission.userId,
			performedBy,
			detail: activityDetail("SUBMISSION_DELETED", {
				title: submission.title,
				sequentialNumber: submission.sequentialNumber,
			}),
		});

		// Clean up orphaned SentReminder rows (no FK relation to submission)
		await tx.sentReminder.deleteMany({
			where: { entityId: submissionId },
		});

		// Null out self-referential FKs to avoid circular constraint issues
		await tx.submission.update({
			where: { id: submissionId },
			data: { presenterId: null, currentVersionId: null },
		});

		// Unlink files from versions before deleting file records
		if (fileKeys.length > 0) {
			await tx.submissionVersion.updateMany({
				where: { submissionId },
				data: { fileId: null },
			});
			await tx.file.deleteMany({
				where: { id: { in: fileKeys.map((f) => f.id) } },
			});
		}

		// Delete submission (cascade handles: versions, authors, keywords,
		// assignments, reviews, decisions, activity logs)
		await tx.submission.delete({ where: { id: submissionId } });
	});

	// Clean up storage blobs (best-effort, after transaction success)
	await Promise.allSettled(fileKeys.map((f) => deleteFile(f.storageKey)));

	return { success: true };
}

// === Admin actions layer ===

/** Maps target status → email event type for decision notifications to authors */
const bulkDecisionEmailMap: Partial<Record<SubmissionStatus, EmailEventType>> =
	{
		ACCEPTED: "DECISION_ACCEPTED",
		CONDITIONALLY_ACCEPTED: "DECISION_CONDITIONALLY_ACCEPTED",
		REVISE_REQUIRED: "DECISION_REVISE_REQUIRED",
		REJECTED: "DECISION_REJECTED",
	};

export async function validateActiveTrack(trackId: string) {
	const track = await prisma.conferenceTrack.findUnique({
		where: { id: trackId },
		select: { isActive: true },
	});
	if (!track) throw new Response("Track not found", { status: 404 });
	if (!track.isActive)
		throw new Response("Track is not active", { status: 400 });
}

export async function updateSubmissionTrack(
	submissionId: string,
	trackId: string | null,
	performedBy?: string,
) {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: { type: true, trackId: true },
	});

	if (!submission) {
		throw new Response("Submission not found", { status: 404 });
	}

	if (submission.type !== "ABSTRACT") {
		throw new Response("Only ABSTRACT submissions can be assigned to tracks", {
			status: 400,
		});
	}

	if (trackId) {
		await validateActiveTrack(trackId);
	}

	await prisma.submission.update({
		where: { id: submissionId },
		data: { trackId },
	});

	await logActivity({
		type: "SUBMISSION_TRACK_CHANGED",
		submissionId,
		performedBy,
		detail: activityDetail("SUBMISSION_TRACK_CHANGED", {
			trackId,
		}),
	});
}

export async function bulkUpdateSubmissionTrack(
	submissionIds: string[],
	trackId: string | null,
) {
	const submissions = await prisma.submission.findMany({
		where: { id: { in: submissionIds } },
		select: { id: true, type: true },
	});

	const nonAbstractSubmissions = submissions.filter(
		(s) => s.type !== "ABSTRACT",
	);

	if (nonAbstractSubmissions.length > 0) {
		throw new Response(
			`The following submissions are not ABSTRACT and cannot be assigned to tracks: ${nonAbstractSubmissions.map((s) => s.id).join(", ")}`,
			{ status: 400 },
		);
	}

	if (trackId) {
		await validateActiveTrack(trackId);
	}

	await prisma.submission.updateMany({
		where: { id: { in: submissionIds } },
		data: { trackId },
	});

	return { updated: submissionIds.length };
}

export interface AdminSubmission {
	id: string;
	sequentialNumber: number;
	title: string;
	type: SubmissionType;
	status: SubmissionStatus;
	currentRound: number;
	ownerName: string;
	ownerEmail: string;
	reviewerCount: number;
	completedReviewsCount: number;
	todo: SubmissionTodo;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Derive the next admin action ("TODO") for a submission.
 * Shares thresholds with the workflow state machine via `hasMinReviewers`
 * (see src/features/workflow/guards.ts) so the two can't drift. `overdue` and
 * `payment` are intentionally outside the machine's domain and live only here.
 */
export function computeSubmissionTodo(args: {
	type: SubmissionType;
	status: SubmissionStatus;
	assigned: number;
	completed: number;
	required: number;
	overdueCount: number;
	feePaid: boolean;
}): SubmissionTodo {
	const { type, status, assigned, completed, required, overdueCount, feePaid } =
		args;

	switch (status) {
		case "DRAFT":
			return { kind: "AWAITING_SUBMISSION" };
		case "SUBMITTED":
		case "RESUBMITTED":
			// EXHIBITOR submissions are never peer-reviewed; decisions happen via
			// the exhibitor approve/reject flow, so there is no review TODO here.
			if (type === "EXHIBITOR") return { kind: "NONE" };
			return hasMinReviewers(assigned, required)
				? { kind: "AWAITING_REVIEWS", completed, required }
				: { kind: "ASSIGN_REVIEWER", assigned, required };
		case "UNDER_REVIEW":
			if (overdueCount > 0) return { kind: "REVIEWER_OVERDUE", overdueCount };
			return hasMinReviewers(assigned, required)
				? { kind: "AWAITING_REVIEWS", completed, required }
				: { kind: "ASSIGN_REVIEWER", assigned, required };
		case "REVIEWS_COMPLETE":
		case "AWAITING_DECISION":
			return { kind: "MAKE_DECISION" };
		case "REVISE_REQUIRED":
			return { kind: "AWAITING_REVISION" };
		case "CONDITIONALLY_ACCEPTED":
			return { kind: "VERIFY_CONDITIONS" };
		case "ACCEPTED":
			return feePaid ? { kind: "NONE" } : { kind: "PAYMENT_REMINDER" };
		default:
			// REJECTED, WITHDRAWN
			return { kind: "NONE" };
	}
}

export interface GetSubmissionsFilters {
	search?: string;
	type?: SubmissionType[];
	status?: SubmissionStatus[];
}

export interface GetSubmissionsResponse {
	submissions: AdminSubmission[];
	total: number;
}

export type SubmissionWhereClause = NonNullable<
	Parameters<typeof prisma.submission.findMany>[0]
>["where"];

/** Build Prisma where clause from admin submission filters */
export function buildSubmissionWhereClause(
	filters: GetSubmissionsFilters,
): SubmissionWhereClause {
	const where: SubmissionWhereClause = {};

	if (filters.type && filters.type.length > 0) {
		where.type = { in: filters.type };
	}

	if (filters.status && filters.status.length > 0) {
		where.status = { in: filters.status };
	}

	if (filters.search) {
		where.OR = [
			{ title: { contains: filters.search, mode: "insensitive" } },
			{
				authors: {
					some: {
						OR: [
							{ firstName: { contains: filters.search, mode: "insensitive" } },
							{ lastName: { contains: filters.search, mode: "insensitive" } },
							{ email: { contains: filters.search, mode: "insensitive" } },
						],
					},
				},
			},
		];
	}

	return where;
}

/** Get all submissions for admin view */
export async function getAdminSubmissions(
	filters: GetSubmissionsFilters,
): Promise<GetSubmissionsResponse> {
	const where = buildSubmissionWhereClause(filters);

	const [submissions, configs] = await Promise.all([
		prisma.submission.findMany({
			where,
			include: {
				user: {
					select: {
						firstName: true,
						lastName: true,
						email: true,
						fee: { select: { paid: true } },
					},
				},
				presenterAuthor: {
					select: { firstName: true, lastName: true, email: true },
				},
				reviewAssignments: {
					where: { status: { notIn: ["CANCELLED"] } },
					select: { status: true, round: true, deadline: true },
				},
			},
			orderBy: { createdAt: "desc" },
		}),
		getSubmissionTypeConfigs(),
	]);

	const requiredByType: Record<SubmissionType, number> = {
		ABSTRACT: configs.ORAL_PRESENTATION.requiredReviewers,
		POSTER: configs.POSTER.requiredReviewers,
		FULL_PAPER: configs.FULL_PAPER.requiredReviewers,
		EXHIBITOR: 0, // exhibitor entries are not peer-reviewed
	};
	const now = new Date();

	const result: AdminSubmission[] = submissions.map((s) => {
		// Get presenter name or owner name
		const presenterName = s.presenterAuthor
			? `${s.presenterAuthor.firstName} ${s.presenterAuthor.lastName}`.trim()
			: `${s.user.firstName ?? ""} ${s.user.lastName ?? ""}`.trim();

		const presenterEmail = s.presenterAuthor?.email ?? s.user.email;

		// Count active and completed assignments for current round only
		const currentRoundAssignments = s.reviewAssignments.filter(
			(a) => a.round === s.currentRound,
		);
		const completedAssignments = currentRoundAssignments.filter(
			(a) => a.status === "COMPLETED",
		);
		// Overdue = reviewer still owes a review past deadline. A COMPLETED
		// assignment is done regardless of its (now-passed) deadline.
		const overdueCount = currentRoundAssignments.filter(
			(a) =>
				a.status === "OVERDUE" ||
				(a.status === "PENDING" && a.deadline !== null && a.deadline < now),
		).length;

		return {
			id: s.id,
			sequentialNumber: s.sequentialNumber,
			title: s.title,
			type: s.type,
			status: s.status,
			currentRound: s.currentRound,
			ownerName: presenterName || s.user.email,
			ownerEmail: presenterEmail,
			reviewerCount: currentRoundAssignments.length,
			completedReviewsCount: completedAssignments.length,
			todo: computeSubmissionTodo({
				type: s.type,
				status: s.status,
				assigned: currentRoundAssignments.length,
				completed: completedAssignments.length,
				required: requiredByType[s.type],
				overdueCount,
				feePaid: s.user.fee?.paid ?? false,
			}),
			createdAt: s.createdAt,
			updatedAt: s.updatedAt,
		};
	});

	return {
		submissions: result,
		total: result.length,
	};
}

/** Get submission details for editor view */
export async function getSubmissionForEditor(submissionId: string): Promise<{
	submission: {
		id: string;
		title: string;
		content: string;
		type: SubmissionType;
		status: SubmissionStatus;
		currentRound: number;
		currentVersionNumber: number;
		trackId: string | null;
		createdAt: Date;
		file: {
			id: string;
			fileName: string;
			originalName: string;
			mimeType: string;
			size: number;
		} | null;
	};
	versions: Array<{
		id: string;
		version: number;
		title: string;
		content: string;
		comment: string | null;
		createdAt: Date;
		file: {
			id: string;
			fileName: string;
			originalName: string;
			mimeType: string;
			size: number;
		} | null;
		authors: Array<{
			firstName: string;
			lastName: string;
			email: string;
			affiliation: string;
			isPresenter: boolean;
		}>;
		keywords: string[];
	}>;
	submitter: {
		id: string;
		firstName: string | null;
		lastName: string | null;
	};
	authors: Array<{
		firstName: string;
		lastName: string;
		email: string;
		affiliationName: string | null;
		isPresenter: boolean;
		userId: string | null;
	}>;
	assignments: Array<{
		id: string;
		reviewerId: string;
		reviewerName: string;
		reviewerEmail: string;
		status: string;
		round: number;
		deadline: Date | null;
	}>;
	reviews: Array<{
		id: string;
		reviewerName: string;
		decision: string;
		comments: string | null;
		privateNotes: string | null;
		scores: Record<string, number> | null;
		confidenceLevel: number | null;
		round: number;
		attachment: {
			id: string;
			fileName: string;
			originalName: string;
			size: number;
		} | null;
	}>;
	activityHistory: Array<{
		activityType: string;
		createdAt: Date;
		performerName: string | null;
		targetUserName: string | null;
		detail: Record<string, string | number | boolean | null>;
	}>;
} | null> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		include: {
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
			versions: {
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
					authorsSnapshot: { orderBy: { orderIndex: "asc" } },
					keywordsSnapshot: true,
				},
				orderBy: { version: "asc" },
			},
			user: { select: { id: true, firstName: true, lastName: true } },
			authors: {
				include: { affiliation: true, user: { select: { id: true } } },
				orderBy: { orderIndex: "asc" },
			},
			reviewAssignments: {
				include: {
					reviewer: {
						select: { firstName: true, lastName: true, email: true },
					},
				},
				orderBy: { assignedAt: "desc" },
			},
			reviews: {
				include: {
					reviewer: {
						select: { firstName: true, lastName: true, email: true },
					},
				},
				orderBy: { createdAt: "desc" },
			},
			activityLog: {
				where: {
					type: {
						in: [
							"SUBMISSION_CREATED",
							"SUBMISSION_DRAFT_SUBMITTED",
							"SUBMISSION_STATUS_CHANGED",
							"SUBMISSION_WITHDRAWN",
							"SUBMISSION_RESUBMITTED",
							"SUBMISSION_REVISION_UPLOADED",
							"SUBMISSION_TRACK_CHANGED",
							"REVIEW_ASSIGNED",
							"REVIEW_SUBMITTED",
							"REVIEW_CANCELLED",
							"REVIEW_OVERDUE",
							"DECISION_SUBMITTED",
							"DECISION_DESK_REJECT",
							"DECISION_DESK_ACCEPT",
							"DECISION_OVERRIDE",
						],
					},
				},
				include: {
					performer: { select: { firstName: true, lastName: true } },
					user: { select: { firstName: true, lastName: true } },
				},
				orderBy: { createdAt: "asc" },
			},
		},
	});

	if (!submission) return null;

	return {
		submission: {
			id: submission.id,
			title: submission.title,
			content: submission.currentVersion?.content ?? submission.content,
			type: submission.type,
			status: submission.status,
			currentRound: submission.currentRound,
			currentVersionNumber: submission.currentVersion?.version ?? 1,
			trackId: submission.trackId,
			createdAt: submission.createdAt,
			file: submission.currentVersion?.file ?? null,
		},
		versions: submission.versions.map((v) => ({
			id: v.id,
			version: v.version,
			title: v.title,
			content: v.content,
			comment: v.comment,
			createdAt: v.createdAt,
			file: v.file,
			authors: v.authorsSnapshot.map((a) => ({
				firstName: a.firstName,
				lastName: a.lastName,
				email: a.email,
				affiliation: a.affiliation,
				isPresenter: a.isPresenter,
			})),
			keywords: v.keywordsSnapshot.map((k) => k.name),
		})),
		submitter: {
			id: submission.user.id,
			firstName: submission.user.firstName,
			lastName: submission.user.lastName,
		},
		authors: submission.authors.map((a) => ({
			firstName: a.firstName,
			lastName: a.lastName,
			email: a.email,
			affiliationName: a.affiliation?.name ?? null,
			isPresenter: a.isPresenter,
			userId: a.userId,
		})),
		assignments: submission.reviewAssignments.map((a) => ({
			id: a.id,
			reviewerId: a.reviewerId,
			reviewerName:
				`${a.reviewer.firstName ?? ""} ${a.reviewer.lastName ?? ""}`.trim() ||
				a.reviewer.email,
			reviewerEmail: a.reviewer.email,
			status: a.status,
			round: a.round,
			deadline: a.deadline,
		})),
		reviews: await (async () => {
			const reviewIds = submission.reviews.map((r) => r.id);
			const attachments =
				reviewIds.length > 0
					? await prisma.file.findMany({
							where: {
								entityType: "REVIEW",
								entityId: { in: reviewIds },
								type: "REVIEW_ATTACHMENT",
							},
							select: {
								id: true,
								entityId: true,
								fileName: true,
								originalName: true,
								size: true,
							},
						})
					: [];
			const attMap = new Map(attachments.map((a) => [a.entityId, a]));

			return submission.reviews.map((r) => {
				const att = attMap.get(r.id);
				return {
					id: r.id,
					reviewerName:
						`${r.reviewer.firstName ?? ""} ${r.reviewer.lastName ?? ""}`.trim() ||
						r.reviewer.email,
					decision: r.decision,
					comments: r.comments,
					privateNotes: r.privateNotes,
					scores: (r.scores as Record<string, number>) ?? null,
					confidenceLevel: r.confidenceLevel,
					round: r.round,
					attachment: att
						? {
								id: att.id,
								fileName: att.fileName,
								originalName: att.originalName,
								size: att.size,
							}
						: null,
				};
			});
		})(),
		activityHistory: submission.activityLog.map((h) => ({
			activityType: h.type,
			createdAt: h.createdAt,
			performerName: h.performer
				? `${h.performer.firstName ?? ""} ${h.performer.lastName ?? ""}`.trim() ||
					null
				: null,
			targetUserName: h.user
				? `${h.user.firstName ?? ""} ${h.user.lastName ?? ""}`.trim() || null
				: null,
			detail:
				(h.detail as Record<string, string | number | boolean | null>) ?? {},
		})),
	};
}

/** Record the editor-decision audit trail + notify the presenter for a bulk decision. */
async function recordBulkDecision(
	submissionId: string,
	targetStatus: SubmissionStatus,
	emailEvent: EmailEventType,
	triggeredBy: string,
): Promise<void> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: { title: true, currentRound: true },
	});
	const decision = decisionTypeFor(targetStatus);
	const reasoning = `Bulk status change to ${targetStatus}`;

	await prisma.editorDecision.create({
		data: {
			submissionId,
			editorId: triggeredBy,
			round: submission?.currentRound ?? 1,
			decision,
			reasoning,
			basedOnReviews: [],
		},
	});

	await logActivity({
		type: "DECISION_SUBMITTED",
		submissionId,
		performedBy: triggeredBy,
		detail: activityDetail("DECISION_SUBMITTED", { decision, reasoning }),
	});

	const presenter = await prisma.submissionAuthor.findFirst({
		where: { submissionId, isPresenter: true },
	});
	if (presenter) {
		void sendEmail(emailEvent, presenter.email, {
			authorName: `${presenter.firstName} ${presenter.lastName}`,
			submissionTitle: submission?.title ?? "",
			letterToAuthor: `Bulk decision: ${targetStatus}`,
			submissionUrl: `${env.APP_BASE_URL}/submissions/${submissionId}`,
		});
	}
}

/** Bulk change status via workflow transitions */
export async function bulkChangeStatus(
	submissionIds: string[],
	targetStatus: SubmissionStatus,
	triggeredBy: string,
): Promise<{ updated: number; errors: string[] }> {
	const option = statusChangeOptions.find((o) => o.value === targetStatus);
	if (!option) {
		return { updated: 0, errors: [`Invalid target status: ${targetStatus}`] };
	}

	const event = { type: option.eventType } as SubmissionEvent;
	let updated = 0;
	const errors: string[] = [];

	// EXHIBITOR decisions must go through the exhibitor approve/reject flow,
	// which also updates Exhibitor.status and sends exhibitor emails.
	const exhibitorSubmissions = await prisma.submission.findMany({
		where: { id: { in: submissionIds }, type: "EXHIBITOR" },
		select: { id: true, title: true },
	});
	const exhibitorIds = new Set(exhibitorSubmissions.map((s) => s.id));
	for (const s of exhibitorSubmissions) {
		errors.push(
			`"${s.title}" is an exhibitor presentation — decide it via the exhibitor approve/reject flow`,
		);
	}

	const emailEvent = bulkDecisionEmailMap[targetStatus];

	for (const id of submissionIds) {
		if (exhibitorIds.has(id)) continue;
		const result = await executeSubmissionTransition(
			id,
			event,
			triggeredBy,
			`Bulk status change to ${targetStatus}`,
		);

		if (!result.success) {
			const submission = await prisma.submission.findUnique({
				where: { id },
				select: { title: true },
			});
			errors.push(
				result.error ??
					`Failed to transition "${submission?.title ?? id}" to ${targetStatus}`,
			);
			continue;
		}

		updated++;
		// Decision-type transitions get an EditorDecision audit record + email
		if (emailEvent) {
			await recordBulkDecision(id, targetStatus, emailEvent, triggeredBy);
		}
	}

	return { updated, errors };
}

/** Bulk assign reviewer to submissions */
export async function bulkAssignReviewer(
	submissionIds: string[],
	reviewerId: string,
	assignedBy: string,
): Promise<{ assigned: number; errors: string[] }> {
	let assigned = 0;
	const errors: string[] = [];

	for (const id of submissionIds) {
		const result = await assignReviewer(id, reviewerId, assignedBy);
		if (result.success) {
			assigned++;
		} else {
			const submission = await prisma.submission.findUnique({
				where: { id },
				select: { title: true },
			});
			errors.push(
				result.error ??
					`Failed to assign reviewer to "${submission?.title ?? id}"`,
			);
		}
	}

	return { assigned, errors };
}
