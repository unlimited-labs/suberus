import type { EmailEventType } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";

/** Get all email templates */
export async function getEmailTemplates() {
	return prisma.emailTemplate.findMany({
		orderBy: { eventType: "asc" },
	});
}

/** Update an email template by eventType */
export async function updateEmailTemplate(
	eventType: EmailEventType,
	data: {
		subject: string;
		body: string;
		ccEmails: string[];
		bccEmails: string[];
		isEnabled: boolean;
	},
) {
	return prisma.emailTemplate.update({
		where: { eventType },
		data,
	});
}
