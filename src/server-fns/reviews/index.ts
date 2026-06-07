import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUploadedFile } from "@/lib/server/form-upload";
import { authMiddleware } from "@/lib/server/middleware/auth";
import {
	getAssignmentForReview,
	type ReviewSubmitData,
	submitReview,
	uploadReviewAttachment,
} from "@/lib/server/reviews";

const reviewDecisionEnum = z.enum([
	"ACCEPT",
	"ACCEPT_WITH_MINOR_REVISIONS",
	"REVISE_AND_RESUBMIT",
	"REJECT",
]);

const submitReviewSchema = z.object({
	assignmentId: z.uuid(),
	decision: reviewDecisionEnum,
	comments: z.string(),
	privateNotes: z.string().optional(),
	scores: z.record(z.string(), z.number().int().min(1).max(5)).optional(),
	confidenceLevel: z.number().int().min(1).max(5).optional(),
});

export const assignmentForReviewQueryOptions = (assignmentId: string) =>
	queryOptions({
		queryKey: ["reviews", "assignment", assignmentId],
		queryFn: () => getAssignmentForReviewFn({ data: { assignmentId } }),
	});

/** Get assignment details for review form (reviewer) */
export const getAssignmentForReviewFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator(z.object({ assignmentId: z.uuid() }))
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
		}): Promise<{ success: boolean; reviewId?: string; error?: string }> => {
			const reviewData: ReviewSubmitData = {
				decision: data.decision,
				comments: data.comments,
				privateNotes: data.privateNotes,
				scores: data.scores,
				confidenceLevel: data.confidenceLevel,
			};

			return submitReview(data.assignmentId, context.user.id, reviewData);
		},
	);

/** Upload a file attachment for a review */
export const uploadReviewAttachmentFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator((data: FormData) =>
		z
			.object({ reviewId: z.uuid(), file: z.instanceof(File) })
			.parse({ reviewId: data.get("reviewId"), file: getUploadedFile(data) }),
	)
	.handler(
		async ({
			data,
			context,
		}): Promise<{ success: boolean; fileId?: string; error?: string }> => {
			return uploadReviewAttachment(data.reviewId, context.user.id, data.file);
		},
	);
