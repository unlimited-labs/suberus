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
} from "./assignments.server";
import { adminMiddleware, authMiddleware } from "./auth.middleware";

export type { ReviewerAssignment, AssignmentWithReviewer, AvailableReviewer };

/** Get available reviewers for a submission (editor) */
export const getAvailableReviewersFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ submissionId: z.string().uuid() }))
	.handler(async ({ data }): Promise<AvailableReviewer[]> => {
		return getAvailableReviewers(data.submissionId);
	});

/** Get assignments for a submission (editor) */
export const getSubmissionAssignmentsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.string().uuid(),
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
			submissionId: z.string().uuid(),
			reviewerId: z.string().uuid(),
			deadline: z.string().datetime().optional(),
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
			assignmentId: z.string().uuid(),
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
							"IN_PROGRESS",
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
		const { prisma } = await import("@/db.server");
		const user = await prisma.user.findUnique({
			where: { id: context.user.id },
			select: { role: true },
		});

		if (!user || !["REVIEWER", "EDITOR", "ADMIN"].includes(user.role)) {
			return { assignments: [], total: 0 };
		}

		return getReviewerAssignments(context.user.id, data);
	});
