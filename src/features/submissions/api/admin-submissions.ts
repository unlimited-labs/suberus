import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	adminOnlyMiddleware,
} from "@/features/auth/server/middleware";
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
import { submitDraftOnBehalf } from "@/features/submissions/server/create-for-user";
import { adminEditSubmission } from "@/features/submissions/server/submissions";
import {
	adminSubmissionsListInput,
	authorSchema,
	submissionIdInput,
	submissionStatusFilterSchema,
	submissionTypeFilterSchema,
} from "@/features/submissions/validations";

export const getAdminSubmissionsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(adminSubmissionsListInput.optional())
	.handler(async ({ data }): Promise<GetSubmissionsResponse> => {
		return getAdminSubmissions(data ?? {});
	});

export const getSubmissionForEditorFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(submissionIdInput)
	.handler(async ({ data }) => {
		return getSubmissionForEditor(data.submissionId);
	});

/**
 * Admin-only in-place edit of a submission at any stage. No dynamic length
 * re-validation: admins are trusted and may need to override author limits.
 */
export const adminEditSubmissionFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(
		z.object({
			submissionId: z.uuid(),
			type: submissionTypeFilterSchema,
			title: z.string(),
			content: z.string(),
			authors: z.array(authorSchema),
			keywords: z.array(z.string()),
			contentFormat: z.enum(["TEXT", "FILE"]),
			trackId: z.uuid().nullish(),
		}),
	)
	.handler(async ({ data, context }) => {
		return adminEditSubmission(data.submissionId, context.user.id, data);
	});

export const adminSubmitDraftFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(submissionIdInput)
	.handler(({ data, context }) =>
		submitDraftOnBehalf(data.submissionId, context.user.id),
	);

export const updateSubmissionTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
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

export const bulkUpdateSubmissionTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			submissionIds: z.array(z.uuid()).min(1),
			trackId: z.uuid().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		return bulkUpdateSubmissionTrack(data.submissionIds, data.trackId);
	});

export const bulkChangeStatusFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			submissionIds: z.array(z.uuid()).min(1),
			status: submissionStatusFilterSchema,
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

export const bulkAssignReviewerFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
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

export const checkSubmissionDeletableFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(submissionIdInput)
	.handler(async ({ data }) => {
		return checkSubmissionDeleteWarnings(data.submissionId);
	});

export const deleteSubmissionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(submissionIdInput)
	.handler(async ({ data, context }) => {
		return deleteSubmission(data.submissionId, context.user.id);
	});
