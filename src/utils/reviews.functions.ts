import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "./auth.middleware";
import {
	getAssignmentForReview,
	type ReviewSubmitData,
	submitReview,
} from "./reviews.server";

const reviewDecisionEnum = z.enum([
	"ACCEPT",
	"ACCEPT_WITH_MINOR_REVISIONS",
	"REVISE_AND_RESUBMIT",
	"REJECT",
]);

const submitReviewSchema = z.object({
	assignmentId: z.string().uuid(),
	decision: reviewDecisionEnum,
	comments: z.string().min(50, "Comments must be at least 50 characters"),
	privateNotes: z.string().optional(),
	scoreNovelty: z.number().int().min(1).max(5).optional(),
	scoreMethodology: z.number().int().min(1).max(5).optional(),
	scoreClarity: z.number().int().min(1).max(5).optional(),
	scoreRelevance: z.number().int().min(1).max(5).optional(),
	confidenceLevel: z.number().int().min(1).max(5).optional(),
});

/** Get assignment details for review form (reviewer) */
export const getAssignmentForReviewFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator(z.object({ assignmentId: z.string().uuid() }))
	.handler(async ({ data, context }) => {
		return getAssignmentForReview(data.assignmentId, context.user.id);
	});

/** Submit a review (reviewer) */
export const submitReviewFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(submitReviewSchema)
	.handler(
		async ({
			data,
			context,
		}): Promise<{ success: boolean; error?: string }> => {
			const reviewData: ReviewSubmitData = {
				decision: data.decision,
				comments: data.comments,
				privateNotes: data.privateNotes,
				scoreNovelty: data.scoreNovelty,
				scoreMethodology: data.scoreMethodology,
				scoreClarity: data.scoreClarity,
				scoreRelevance: data.scoreRelevance,
				confidenceLevel: data.confidenceLevel,
			};

			return submitReview(data.assignmentId, context.user.id, reviewData);
		},
	);
