import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "./auth.middleware";
import {
	getEmailTemplates,
	updateEmailTemplate,
} from "./email-templates.server";

const emailEventTypeEnum = z.enum([
	"SUBMISSION_RECEIVED",
	"SUBMISSION_WITHDRAWN",
	"REVIEWER_ASSIGNED",
	"REVIEWER_REMINDER",
	"REVIEW_SUBMITTED",
	"ALL_REVIEWS_COMPLETE",
	"DECISION_ACCEPTED",
	"DECISION_CONDITIONALLY_ACCEPTED",
	"DECISION_REVISE_REQUIRED",
	"DECISION_REJECTED",
	"REVISION_REMINDER",
	"REVISION_RECEIVED",
	"DEADLINE_APPROACHING",
	"ACCOUNT_CREATED",
	"PASSWORD_RESET",
	"EMAIL_VERIFICATION",
	"INVITATION",
]);

/** Get all email templates (admin only) */
export const getEmailTemplatesFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getEmailTemplates();
	});

/** Update an email template (admin only) */
export const updateEmailTemplateFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			eventType: emailEventTypeEnum,
			subject: z.string().min(1).max(200),
			body: z.string().min(1),
			ccEmails: z.array(z.string()),
			bccEmails: z.array(z.string()),
			isEnabled: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		const { eventType, ...updateData } = data;
		return updateEmailTemplate(eventType, updateData);
	});
