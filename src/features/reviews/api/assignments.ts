import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
import {
	adminMiddleware,
	authMiddleware,
} from "@/shared/server/middleware/auth";

export type { AssignmentWithReviewer, AvailableReviewer, ReviewerAssignment };

export const myAssignmentsQueryOptions = () =>
	queryOptions({
		queryKey: ["reviews", "mine"],
		queryFn: () => getMyAssignmentsFn(),
	});

/** Get available reviewers for a submission (editor) */
export const getAvailableReviewersFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ submissionId: z.uuid() }))
	.handler(async ({ data }): Promise<AvailableReviewer[]> => {
		return getAvailableReviewers(data.submissionId);
	});

/** Get assignments for a submission (editor) */
export const getSubmissionAssignmentsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
			round: z.number().int().positive().optional(),
		}),
	)
	.handler(async ({ data }): Promise<AssignmentWithReviewer[]> => {
		return getSubmissionAssignments(data.submissionId, data.round);
	});

/** Assign reviewer to submission (editor) */
export const assignReviewerFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
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

/** Cancel assignment (editor) */
export const cancelAssignmentFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
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

/** Get reviewer's own assignments */
export const getMyAssignmentsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator(
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
		// Verify user is a reviewer
		const { prisma } = await import("@/shared/server/db.server");
		const user = await prisma.user.findUnique({
			where: { id: context.user.id },
			select: { role: true },
		});

		if (!user || !["REVIEWER", "EDITOR", "ADMIN"].includes(user.role)) {
			return { assignments: [], total: 0 };
		}

		return getReviewerAssignments(context.user.id, data);
	});
