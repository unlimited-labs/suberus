import { prisma } from "@/db";
import type {
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";

export interface AdminSubmission {
	id: string;
	title: string;
	type: SubmissionType;
	status: SubmissionStatus;
	currentRound: number;
	ownerName: string;
	ownerEmail: string;
	reviewerCount: number;
	completedReviewsCount: number;
	createdAt: Date;
	updatedAt: Date;
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

/** Get all submissions for admin view */
export async function getAdminSubmissions(
	filters: GetSubmissionsFilters,
): Promise<GetSubmissionsResponse> {
	const where: NonNullable<
		Parameters<typeof prisma.submission.findMany>[0]
	>["where"] = {};

	// Type filter
	if (filters.type && filters.type.length > 0) {
		where.type = { in: filters.type };
	}

	// Status filter
	if (filters.status && filters.status.length > 0) {
		where.status = { in: filters.status };
	}

	// Search filter
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

	const submissions = await prisma.submission.findMany({
		where,
		include: {
			user: {
				select: { firstName: true, lastName: true, email: true },
			},
			presenterAuthor: {
				select: { firstName: true, lastName: true, email: true },
			},
			reviewAssignments: {
				where: { status: { notIn: ["CANCELLED"] } },
				select: { status: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});

	const result: AdminSubmission[] = submissions.map((s) => {
		// Get presenter name or owner name
		const presenterName = s.presenterAuthor
			? `${s.presenterAuthor.firstName} ${s.presenterAuthor.lastName}`.trim()
			: `${s.user.firstName ?? ""} ${s.user.lastName ?? ""}`.trim();

		const presenterEmail = s.presenterAuthor?.email ?? s.user.email;

		// Count active and completed assignments for current round
		const currentRoundAssignments = s.reviewAssignments.filter(
			(a) => a.status !== "CANCELLED",
		);
		const completedAssignments = currentRoundAssignments.filter(
			(a) => a.status === "COMPLETED",
		);

		return {
			id: s.id,
			title: s.title,
			type: s.type,
			status: s.status,
			currentRound: s.currentRound,
			ownerName: presenterName || s.user.email,
			ownerEmail: presenterEmail,
			reviewerCount: currentRoundAssignments.length,
			completedReviewsCount: completedAssignments.length,
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
		sessionId: string | null;
	};
	authors: Array<{
		firstName: string;
		lastName: string;
		email: string;
		affiliationName: string | null;
		isPresenter: boolean;
	}>;
	assignments: Array<{
		id: string;
		reviewerId: string;
		reviewerName: string;
		reviewerEmail: string;
		status: string;
		round: number;
	}>;
	reviews: Array<{
		id: string;
		reviewerName: string;
		decision: string;
		comments: string | null;
		round: number;
	}>;
	statusHistory: Array<{
		fromStatus: string | null;
		toStatus: string;
		event: string | null;
		reason: string | null;
		createdAt: Date;
		triggeredByName: string | null;
	}>;
} | null> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		include: {
			currentVersion: true,
			authors: {
				include: { affiliation: true },
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
			statusHistory: {
				include: {
					triggeredByUser: { select: { firstName: true, lastName: true } },
				},
				orderBy: { createdAt: "desc" },
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
			sessionId: submission.sessionId,
		},
		authors: submission.authors.map((a) => ({
			firstName: a.firstName,
			lastName: a.lastName,
			email: a.email,
			affiliationName: a.affiliation?.name ?? null,
			isPresenter: a.isPresenter,
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
		})),
		reviews: submission.reviews.map((r) => ({
			id: r.id,
			reviewerName:
				`${r.reviewer.firstName ?? ""} ${r.reviewer.lastName ?? ""}`.trim() ||
				r.reviewer.email,
			decision: r.decision,
			comments: r.comments,
			round: r.round,
		})),
		statusHistory: submission.statusHistory.map((h) => ({
			fromStatus: h.fromStatus,
			toStatus: h.toStatus,
			event: h.event,
			reason: h.reason,
			createdAt: h.createdAt,
			triggeredByName: h.triggeredByUser
				? `${h.triggeredByUser.firstName ?? ""} ${h.triggeredByUser.lastName ?? ""}`.trim()
				: null,
		})),
	};
}
