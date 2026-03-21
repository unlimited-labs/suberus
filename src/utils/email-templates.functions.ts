import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendTestEmail } from "@/lib/server/email";
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
	"DECISION_OVERRIDDEN",
	"REVISION_REMINDER",
	"REVISION_RECEIVED",
	"DEADLINE_APPROACHING",
	"ACCOUNT_CREATED",
	"PASSWORD_RESET",
	"EMAIL_VERIFICATION",
	"INVITATION",
]);

export const emailTemplatesQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "email-templates"],
		queryFn: () => getEmailTemplatesFn(),
	});

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

/** Send a test email to the current admin (admin only) */
export const sendTestEmailFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			subject: z.string().min(1),
			body: z.string().min(1),
			isHtml: z.boolean(),
		}),
	)
	.handler(async ({ data, context }) => {
		await sendTestEmail(
			context.user.email,
			data.subject,
			data.body,
			data.isHtml,
		);
	});
