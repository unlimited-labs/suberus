import { addDays, subDays } from "date-fns";
import { env } from "@/env.ts";
import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { getSetting } from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import { isNonSubmittable } from "@/features/submissions/submittable";
import { canAssignReviewer } from "@/features/workflow";
import {
	checkAndTriggerReviewCompletion,
	executeAssignmentTransition,
	executeSubmissionTransition,
	revertToPreReviewIfNoReviewers,
} from "@/features/workflow/server/workflow";
import type {
	AssignmentStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import { logger } from "@/logger.ts";
import { formatDate } from "@/shared/lib/format-date";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";
import { compareAssignmentUrgency } from "./assignment-urgency";

export interface AvailableReviewer {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
	affiliationName: string | null;
	activeAssignmentsCount: number;
	completedReviewsCount: number;
}

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

export async function getAvailableReviewers(
	submissionId: string,
): Promise<AvailableReviewer[]> {
	const submission = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
		include: {
			authors: { select: { email: true, userId: true } },
			reviewAssignments: true,
		},
	});

	const authorEmails = submission.authors.map((a) => a.email.toLowerCase());
	const authorUserIds = submission.authors.flatMap((a) =>
		a.userId === null ? [] : [a.userId],
	);

	const assignedReviewerIds = submission.reviewAssignments.flatMap((a) =>
		a.round === submission.currentRound && a.status !== "CANCELLED"
			? [a.reviewerId]
			: [],
	);

	const reviewers = await prisma.user.findMany({
		where: {
			role: { in: ["REVIEWER", "EDITOR", "ADMIN"] },
			isActive: true,
			id: {
				notIn: [...assignedReviewerIds, ...authorUserIds, submission.userId],
			},
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

export async function assignReviewer(
	submissionId: string,
	reviewerId: string,
	assignedBy: string,
	customDeadline?: Date,
): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
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

	if (isNonSubmittable(submission.type)) {
		logger.warn(
			`[assignment] cannot assign reviewer to ${submissionId}: ${submission.type} submissions are not peer-reviewed`,
		);
		return {
			success: false,
			error: `Cannot assign reviewer: ${submission.type === "EXHIBITOR" ? "exhibitor submissions" : "invited talks"} are not peer-reviewed`,
		};
	}

	const configKey = SUBMISSION_TYPE_TO_KEY[submission.type];
	const config = await getSetting(configKey);

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

	const deadline =
		customDeadline ?? addDays(new Date(), config.reviewDeadlineDays);

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

		await checkAndTriggerReviewCompletion(assignment.submissionId, cancelledBy);
		await revertToPreReviewIfNoReviewers(assignment.submissionId, cancelledBy);
	}

	return { success: result.success, error: result.error };
}

export async function markOverdueAssignments(): Promise<number> {
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

	const configKeys = [
		...new Set(
			assignments.map((a) => SUBMISSION_TYPE_TO_KEY[a.submission.type]),
		),
	];
	const configs: Record<
		string,
		{ reviewMode: "OPEN" | "SINGLE_BLIND" | "DOUBLE_BLIND" }
	> = {};
	await Promise.all(
		configKeys.map(async (key) => {
			const config = await getSetting(key);
			configs[key] = { reviewMode: config.reviewMode };
		}),
	);

	let result: ReviewerAssignment[] = assignments.map((a) => {
		const configKey = SUBMISSION_TYPE_TO_KEY[a.submission.type];
		const reviewMode = configs[configKey]?.reviewMode ?? "SINGLE_BLIND";
		const presenter = a.submission.authors[0];

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

	const now = new Date();
	result.sort((a, b) => compareAssignmentUrgency(a, b, now));

	return { assignments: result, total: result.length };
}
