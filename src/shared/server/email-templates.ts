import type { EmailEventType } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";

export async function getEmailTemplates() {
	return prisma.emailTemplate.findMany({
		orderBy: { eventType: "asc" },
	});
}

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
