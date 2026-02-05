import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	type GetSubmissionsResponse,
	getAdminSubmissions,
	getSubmissionForEditor,
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
