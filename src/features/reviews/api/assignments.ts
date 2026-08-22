import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import {
	type AssignmentWithReviewer,
	type AvailableReviewer,
	assignReviewer,
	cancelAssignment,
	getAvailableReviewers,
	getReviewerAssignments,
	getSubmissionAssignments,
	type ReviewerAssignment,
} from "@/features/reviews/server/assignments";
import { prisma } from "@/shared/server/db.server";

export type { AssignmentWithReviewer, AvailableReviewer, ReviewerAssignment };

export const myAssignmentsQueryOptions = () =>
	queryOptions({
		queryKey: ["reviews", "mine"],
		queryFn: () => getMyAssignmentsFn(),
	});

export const getAvailableReviewersFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.object({ submissionId: z.uuid() }))
	.handler(async ({ data }): Promise<AvailableReviewer[]> => {
		return getAvailableReviewers(data.submissionId);
	});

export const getSubmissionAssignmentsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			submissionId: z.uuid(),
			round: z.number().int().positive().optional(),
		}),
	)
	.handler(async ({ data }): Promise<AssignmentWithReviewer[]> => {
		return getSubmissionAssignments(data.submissionId, data.round);
	});

export const assignReviewerFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			submissionId: z.uuid(),
			reviewerId: z.uuid(),
			deadline: z.iso.datetime().optional(),
		}),
	)
	.handler(
		async ({
			data,
			context,
		}): Promise<{
			success: boolean;
			assignmentId?: string;
			error?: string;
		}> => {
			return assignReviewer(
				data.submissionId,
				data.reviewerId,
				context.user.id,
				data.deadline ? new Date(data.deadline) : undefined,
			);
		},
	);

export const cancelAssignmentFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			assignmentId: z.uuid(),
			reason: z.string().optional(),
		}),
	)
	.handler(
		async ({
			data,
			context,
		}): Promise<{ success: boolean; error?: string }> => {
			return cancelAssignment(data.assignmentId, context.user.id, data.reason);
		},
	);

export const getMyAssignmentsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(
		z
			.object({
				status: z
					.array(
						z.enum([
							"PENDING",

							"COMPLETED",
							"CANCELLED",
							"OVERDUE",
						]),
					)
					.optional(),
				search: z.string().optional(),
			})
			.optional(),
	)
	.handler(async ({ data, context }) => {
		const user = await prisma.user.findUnique({
			where: { id: context.user.id },
			select: { role: true },
		});

		if (!user || !["REVIEWER", "EDITOR", "ADMIN"].includes(user.role)) {
			return { assignments: [], total: 0 };
		}

		return getReviewerAssignments(context.user.id, data);
	});
