import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	bulkAssignReviewer,
	bulkChangeStatus,
	bulkUpdateSubmissionTrack,
	checkSubmissionDeleteWarnings,
	deleteSubmission,
	type GetSubmissionsResponse,
	getAdminSubmissions,
	getSubmissionForEditor,
	updateSubmissionTrack,
} from "@/features/submissions/server/admin-submissions";
import { adminMiddleware } from "@/lib/server/middleware/auth";

const submissionTypeEnum = z.enum(["ABSTRACT", "FULL_PAPER", "POSTER"]);
const submissionStatusEnum = z.enum([
	"DRAFT",
	"SUBMITTED",
	"UNDER_REVIEW",
	"REVIEWS_COMPLETE",
	"AWAITING_DECISION",
	"REVISE_REQUIRED",
	"RESUBMITTED",
	"ACCEPTED",
	"CONDITIONALLY_ACCEPTED",
	"REJECTED",
	"WITHDRAWN",
]);

/** Get all submissions for admin view */
export const getAdminSubmissionsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(
		z
			.object({
				search: z.string().optional(),
				type: z.array(submissionTypeEnum).optional(),
				status: z.array(submissionStatusEnum).optional(),
			})
			.optional(),
	)
	.handler(async ({ data }): Promise<GetSubmissionsResponse> => {
		return getAdminSubmissions(data ?? {});
	});

/** Get submission details for editor */
export const getSubmissionForEditorFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ submissionId: z.uuid() }))
	.handler(async ({ data }) => {
		return getSubmissionForEditor(data.submissionId);
	});

/** Update submission track assignment */
export const updateSubmissionTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
			trackId: z.uuid().nullable(),
		}),
	)
	.handler(async ({ data, context }) => {
		await updateSubmissionTrack(
			data.submissionId,
			data.trackId,
			context.user.id,
		);
	});

/** Bulk update track assignment for multiple submissions */
export const bulkUpdateSubmissionTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionIds: z.array(z.uuid()).min(1),
			trackId: z.uuid().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		return bulkUpdateSubmissionTrack(data.submissionIds, data.trackId);
	});

/** Bulk change submission status via workflow transitions */
export const bulkChangeStatusFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionIds: z.array(z.uuid()).min(1),
			status: submissionStatusEnum,
		}),
	)
	.handler(async ({ data, context }) => {
		return bulkChangeStatus(data.submissionIds, data.status, context.user.id);
	});

export const adminSubmissionsQueryOptions = () =>
	queryOptions({
		queryKey: ["submissions", "admin"],
		queryFn: () => getAdminSubmissionsFn(),
	});

export const editorSubmissionQueryOptions = (submissionId: string) =>
	queryOptions({
		queryKey: ["submissions", "editor", submissionId],
		queryFn: () => getSubmissionForEditorFn({ data: { submissionId } }),
	});

/** Bulk assign reviewer to submissions */
export const bulkAssignReviewerFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionIds: z.array(z.uuid()).min(1),
			reviewerId: z.uuid(),
		}),
	)
	.handler(async ({ data, context }) => {
		return bulkAssignReviewer(
			data.submissionIds,
			data.reviewerId,
			context.user.id,
		);
	});

/** Check warnings before deleting a submission */
export const checkSubmissionDeletableFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ submissionId: z.uuid() }))
	.handler(async ({ data }) => {
		return checkSubmissionDeleteWarnings(data.submissionId);
	});

/** Delete a submission */
export const deleteSubmissionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ submissionId: z.uuid() }))
	.handler(async ({ data, context }) => {
		return deleteSubmission(data.submissionId, context.user.id);
	});
