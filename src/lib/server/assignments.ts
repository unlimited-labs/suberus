import { addDays, compareAsc, subDays } from "date-fns";
import { prisma } from "@/db.server";
import { env } from "@/env.ts";
import type {
	AssignmentStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import { activityDetail } from "@/lib/activity-log";
import { formatDate } from "@/lib/format-date";
import { logActivity } from "@/lib/server/activity-log";
import { sendEmail } from "@/lib/server/email";
import { getSetting } from "@/lib/server/settings";
import {
	checkAndTriggerReviewCompletion,
	executeAssignmentTransition,
	executeSubmissionTransition,
} from "@/lib/server/workflow";
import { SUBMISSION_TYPE_TO_KEY } from "@/lib/settings/types";
import { canAssignReviewer } from "@/lib/workflow";
import { logger } from "@/logger.ts";

/** Reviewer data for assignment UI */
export interface AvailableReviewer {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
	affiliationName: string | null;
	activeAssignmentsCount: number;
	completedReviewsCount: number;
}

/** Assignment data with reviewer info */
export interface AssignmentWithReviewer {
	id: string;
	reviewerId: string;
	reviewerName: string;
	reviewerEmail: string;
	round: number;
	status: AssignmentStatus;
	assignedAt: Date;
	deadline: Date | null;
	startedAt: Date | null;
	completedAt: Date | null;
}

/** Get available reviewers for a submission (excluding already assigned) */
export async function getAvailableReviewers(
	submissionId: string,
): Promise<AvailableReviewer[]> {
	// Get submission to check authors (avoid assigning author as reviewer)
	const submission = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
		include: {
			authors: { select: { email: true, userId: true } },
			reviewAssignments: true,
		},
	});

	// Get emails and user IDs of authors
	const authorEmails = submission.authors.map((a) => a.email.toLowerCase());
	const authorUserIds = submission.authors
		.map((a) => a.userId)
		.filter((id): id is string => id !== null);

	// Get already assigned reviewer IDs (current round only — allows reassignment in new rounds)
	const assignedReviewerIds = submission.reviewAssignments
		.filter(
			(a) => a.round === submission.currentRound && a.status !== "CANCELLED",
		)
		.map((a) => a.reviewerId);

	// Query eligible reviewers (REVIEWER, EDITOR, ADMIN roles)
	const reviewers = await prisma.user.findMany({
		where: {
			role: { in: ["REVIEWER", "EDITOR", "ADMIN"] },
			isActive: true,
			id: { notIn: [...assignedReviewerIds, ...authorUserIds] },
			email: { notIn: authorEmails },
		},
		include: {
			affiliation: { select: { name: true } },
			reviewAssignments: {
				where: { status: "PENDING" },
			},
			reviews: true,
		},
	});

	return reviewers.map((r) => ({
		id: r.id,
		firstName: r.firstName,
		lastName: r.lastName,
		email: r.email,
		affiliationName: r.affiliation?.name ?? null,
		activeAssignmentsCount: r.reviewAssignments.length,
		completedReviewsCount: r.reviews.length,
	}));
}

/** Get current assignments for a submission */
export async function getSubmissionAssignments(
	submissionId: string,
	round?: number,
): Promise<AssignmentWithReviewer[]> {
	const submission = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
		select: { currentRound: true },
	});

	const targetRound = round ?? submission.currentRound;

	const assignments = await prisma.reviewAssignment.findMany({
		where: { submissionId, round: targetRound },
		include: {
			reviewer: {
				select: { firstName: true, lastName: true, email: true },
			},
		},
		orderBy: { orderIndex: "asc" },
	});

	return assignments.map((a) => ({
		id: a.id,
		reviewerId: a.reviewerId,
		reviewerName:
			`${a.reviewer.firstName ?? ""} ${a.reviewer.lastName ?? ""}`.trim() ||
			a.reviewer.email,
		reviewerEmail: a.reviewer.email,
		round: a.round,
		status: a.status,
		assignedAt: a.assignedAt,
		deadline: a.deadline,
		startedAt: a.startedAt,
		completedAt: a.completedAt,
	}));
}

/** Assign a reviewer to a submission */
export async function assignReviewer(
	submissionId: string,
	reviewerId: string,
	assignedBy: string,
	customDeadline?: Date,
): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
	// Fetch submission with all assignments and filter by currentRound in memory
	const submissionWithRelations = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
		include: {
			reviewAssignments: true,
		},
	});

	const submission = {
		...submissionWithRelations,
		reviewAssignments: submissionWithRelations.reviewAssignments.filter(
			(a) =>
				a.round === submissionWithRelations.currentRound &&
				a.status !== "CANCELLED",
		),
	};

	// Get config
	const configKey = SUBMISSION_TYPE_TO_KEY[submission.type];
	const config = await getSetting(configKey);

	// Validate can assign more reviewers
	const currentCount = submission.reviewAssignments.length;
	if (!canAssignReviewer(submission.status)) {
		logger.warn(
			`[assignment] cannot assign reviewer to ${submissionId}: invalid status ${submission.status}`,
		);
		return {
			success: false,
			error: "Cannot assign reviewer: invalid submission status",
		};
	}

	// Check if reviewer already assigned
	const existingAssignment = submission.reviewAssignments.find(
		(a) => a.reviewerId === reviewerId,
	);
	if (existingAssignment) {
		logger.warn(
			`[assignment] reviewer ${reviewerId} already assigned to ${submissionId}`,
		);
		return {
			success: false,
			error: "Reviewer already assigned to this submission",
		};
	}

	// Calculate deadline
	const deadline =
		customDeadline ?? addDays(new Date(), config.reviewDeadlineDays);

	// Create assignment
	const assignment = await prisma.reviewAssignment.create({
		data: {
			submissionId,
			reviewerId,
			round: submission.currentRound,
			status: "PENDING",
			deadline,
			assignedBy,
			orderIndex: currentCount,
		},
	});

	// Check if we should transition to UNDER_REVIEW
	const newCount = currentCount + 1;
	if (
		newCount >= config.requiredReviewers &&
		["SUBMITTED", "RESUBMITTED"].includes(submission.status)
	) {
		await executeSubmissionTransition(
			submissionId,
			{ type: "ASSIGN_REVIEWER" },
			assignedBy,
			`Assigned reviewer (${newCount}/${config.requiredReviewers} required)`,
		);
	}

	// Send assignment notification to reviewer
	const [reviewer, dateFormat] = await Promise.all([
		prisma.user.findUniqueOrThrow({
			where: { id: reviewerId },
			select: { email: true, firstName: true, lastName: true },
		}),
		getSetting("DATE_FORMAT"),
	]);

	void sendEmail("REVIEWER_ASSIGNED", reviewer.email, {
		reviewerName:
			`${reviewer.firstName ?? ""} ${reviewer.lastName ?? ""}`.trim() ||
			reviewer.email,
		submissionTitle: submission.title,
		deadline: formatDate(deadline, dateFormat),
		reviewUrl: `${env.APP_BASE_URL}/reviews/${assignment.id}`,
	});

	logger.info(
		`[assignment] assigned reviewer ${reviewerId} to submission ${submissionId} (${assignment.id})`,
	);

	await logActivity({
		type: "REVIEW_ASSIGNED",
		submissionId,
		userId: reviewerId,
		performedBy: assignedBy,
		detail: activityDetail("REVIEW_ASSIGNED", {
			assignmentId: assignment.id,
			deadline: customDeadline?.toISOString(),
		}),
	});

	return { success: true, assignmentId: assignment.id };
}

/** Cancel an assignment */
export async function cancelAssignment(
	assignmentId: string,
	cancelledBy: string,
	_reason?: string,
): Promise<{ success: boolean; error?: string }> {
	const assignment = await prisma.reviewAssignment.findUnique({
		where: { id: assignmentId },
	});

	if (!assignment) {
		return { success: false, error: "Assignment not found" };
	}

	if (assignment.status === "COMPLETED") {
		return { success: false, error: "Cannot cancel completed assignment" };
	}

	if (assignment.status === "CANCELLED") {
		return { success: false, error: "Assignment already cancelled" };
	}

	const result = await executeAssignmentTransition(
		assignmentId,
		{ type: "CANCEL" },
		cancelledBy,
	);

	if (result.success) {
		logger.info(`[assignment] cancelled ${assignmentId}`);

		await logActivity({
			type: "REVIEW_CANCELLED",
			submissionId: assignment.submissionId,
			userId: assignment.reviewerId,
			performedBy: cancelledBy,
			detail: activityDetail("REVIEW_CANCELLED", { assignmentId }),
		});

		// Re-check if remaining reviews now satisfy completion criteria
		// (e.g., requiredReviewers was reduced and cancelled assignment was excess)
		await checkAndTriggerReviewCompletion(assignment.submissionId, cancelledBy);
	}

	return { success: result.success, error: result.error };
}

/** Mark overdue assignments (called by cron job) */
export async function markOverdueAssignments(): Promise<number> {
	// Grace period: mark overdue 1 day after deadline (per WORKFLOW.md)
	const oneDayAgo = subDays(new Date(), 1);

	const overdueAssignments = await prisma.reviewAssignment.findMany({
		where: {
			status: "PENDING",
			deadline: { lt: oneDayAgo },
		},
	});

	let count = 0;
	for (const assignment of overdueAssignments) {
		const result = await executeAssignmentTransition(assignment.id, {
			type: "MARK_OVERDUE",
		});
		if (result.success) {
			count++;

			await logActivity({
				type: "REVIEW_OVERDUE",
				submissionId: assignment.submissionId,
				userId: assignment.reviewerId,
				detail: activityDetail("REVIEW_OVERDUE", {
					assignmentId: assignment.id,
				}),
			});
		}
	}

	logger.info(`[assignment] marked ${count} overdue assignments`);

	return count;
}

/** Reviewer assignment with author info for display */
export interface ReviewerAssignment {
	id: string;
	submissionId: string;
	submissionTitle: string;
	submissionType: SubmissionType;
	round: number;
	status: AssignmentStatus;
	assignedAt: Date;
	deadline: Date | null;
	startedAt: Date | null;
	completedAt: Date | null;
	authorName: string;
	authorAffiliation: string;
	reviewMode: "OPEN" | "SINGLE_BLIND" | "DOUBLE_BLIND";
}

/** Get reviewer's assignments */
export async function getReviewerAssignments(
	reviewerId: string,
	filters?: {
		status?: AssignmentStatus[];
		search?: string;
	},
): Promise<{
	assignments: ReviewerAssignment[];
	total: number;
}> {
	const where: NonNullable<
		Parameters<typeof prisma.reviewAssignment.findMany>[0]
	>["where"] = {
		reviewerId,
	};

	if (filters?.status && filters.status.length > 0) {
		where.status = { in: filters.status };
	}

	const assignments = await prisma.reviewAssignment.findMany({
		where,
		include: {
			submission: {
				select: {
					title: true,
					type: true,
					authors: {
						where: { isPresenter: true },
						take: 1,
						include: { affiliation: { select: { name: true } } },
					},
				},
			},
		},
		orderBy: [{ deadline: "asc" }, { assignedAt: "desc" }],
	});

	// Fetch review mode configs for all submission types
	const configKeys = [
		...new Set(
			assignments.map((a) => SUBMISSION_TYPE_TO_KEY[a.submission.type]),
		),
	];
	const configs: Record<
		string,
		{ reviewMode: "OPEN" | "SINGLE_BLIND" | "DOUBLE_BLIND" }
	> = {};
	for (const key of configKeys) {
		const config = await getSetting(key);
		configs[key] = { reviewMode: config.reviewMode };
	}

	let result: ReviewerAssignment[] = assignments.map((a) => {
		const configKey = SUBMISSION_TYPE_TO_KEY[a.submission.type];
		const reviewMode = configs[configKey]?.reviewMode ?? "SINGLE_BLIND";
		const presenter = a.submission.authors[0];

		// In DOUBLE_BLIND mode, hide author info from reviewer
		const authorName =
			reviewMode === "DOUBLE_BLIND"
				? "Anonymous Author"
				: presenter
					? `${presenter.firstName} ${presenter.lastName}`
					: "Unknown";
		const authorAffiliation =
			reviewMode === "DOUBLE_BLIND"
				? "Anonymous Institution"
				: (presenter?.affiliation?.name ?? "Unknown");

		return {
			id: a.id,
			submissionId: a.submissionId,
			submissionTitle: a.submission.title,
			submissionType: a.submission.type,
			round: a.round,
			status: a.status,
			assignedAt: a.assignedAt,
			deadline: a.deadline,
			startedAt: a.startedAt,
			completedAt: a.completedAt,
			authorName,
			authorAffiliation,
			reviewMode,
		};
	});

	// Apply search filter (don't search author in DOUBLE_BLIND)
	if (filters?.search) {
		const search = filters.search.toLowerCase();
		result = result.filter(
			(a) =>
				a.submissionTitle.toLowerCase().includes(search) ||
				(a.reviewMode !== "DOUBLE_BLIND" &&
					(a.authorName.toLowerCase().includes(search) ||
						a.authorAffiliation.toLowerCase().includes(search))),
		);
	}

	// Sort by urgency
	result.sort((a, b) => {
		const now = new Date();
		if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
		if (b.status === "COMPLETED" && a.status !== "COMPLETED") return -1;

		const aOverdue = a.status === "OVERDUE" || (a.deadline && a.deadline < now);
		const bOverdue = b.status === "OVERDUE" || (b.deadline && b.deadline < now);
		if (aOverdue && !bOverdue) return -1;
		if (!aOverdue && bOverdue) return 1;

		if (!a.deadline && !b.deadline) return 0;
		if (!a.deadline) return 1;
		if (!b.deadline) return -1;
		return compareAsc(a.deadline, b.deadline);
	});

	return { assignments: result, total: result.length };
}
