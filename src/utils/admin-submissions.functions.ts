import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	bulkAssignReviewer,
	bulkChangeStatus,
	bulkUpdateSubmissionSession,
	type GetSubmissionsResponse,
	getAdminSubmissions,
	getSubmissionForEditor,
	updateSubmissionSession,
} from "./admin-submissions.server";
import { adminMiddleware } from "./auth.middleware";

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

/** Update submission session assignment */
export const updateSubmissionSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
			sessionId: z.uuid().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		await updateSubmissionSession(data.submissionId, data.sessionId);
	});

/** Bulk update session assignment for multiple submissions */
export const bulkUpdateSubmissionSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionIds: z.array(z.uuid()).min(1),
			sessionId: z.uuid().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		return bulkUpdateSubmissionSession(data.submissionIds, data.sessionId);
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
