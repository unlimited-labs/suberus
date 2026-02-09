import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
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
	.inputValidator(z.object({ submissionId: z.string().uuid() }))
	.handler(async ({ data }) => {
		return getSubmissionForEditor(data.submissionId);
	});

/** Update submission session assignment */
export const updateSubmissionSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.string().uuid(),
			sessionId: z.string().uuid().nullable(),
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
			submissionIds: z.array(z.string().uuid()).min(1),
			sessionId: z.string().uuid().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		return bulkUpdateSubmissionSession(data.submissionIds, data.sessionId);
	});
