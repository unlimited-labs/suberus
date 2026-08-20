import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { env } from "@/env";
import { adminMiddleware } from "@/features/auth/server/middleware";
import { getSetting } from "@/features/settings/server/settings";
import { EmailEventType } from "@/generated/prisma/enums";
import { sendTestEmail } from "@/shared/server/email";
import {
	getEmailTemplates,
	updateEmailTemplate,
} from "@/shared/server/email-templates";

const emailEventTypeEnum = z.enum(EmailEventType);

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
	.validator(
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
	.validator(
		z.object({
			subject: z.string().min(1),
			body: z.string().min(1),
			isHtml: z.boolean(),
		}),
	)
	.handler(async ({ data, context }) => {
		const conferenceName =
			(await getSetting("CONFERENCE_NAME")) ?? "Example Conference";
		const baseUrl = env.APP_BASE_URL;
		const fullName =
			[context.user.firstName, context.user.name].filter(Boolean).join(" ") ||
			"Example User";

		const placeholders = {
			authorName: fullName,
			submissionTitle: "Example Submission Title",
			submissionUrl: `${baseUrl}/submissions/example`,
			firstName: fullName.split(" ")[0],
			verificationUrl: `${baseUrl}/verify?token=example`,
			conferenceName,
			resetUrl: `${baseUrl}/reset?token=example`,
			reviewerName: fullName,
			deadline: "2026-03-15",
			reviewUrl: `${baseUrl}/reviews/example`,
			letterToAuthor:
				"We are pleased to inform you that your submission has been accepted.",
			versionNumber: "2",
			recipientName: fullName,
			roleName: "Reviewer",
			registrationUrl: `${baseUrl}/register?token=example`,
			expiresAt: "2026-04-01",
		} satisfies Record<string, string>;

		await sendTestEmail(
			context.user.email,
			data.subject,
			data.body,
			data.isHtml,
			placeholders,
		);
	});
