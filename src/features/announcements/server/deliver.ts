import type { AnnouncementStatus } from "@/generated/prisma/enums";
import { logger } from "@/logger.ts";
import {
	applyPlaceholders,
	parseRecipientData,
	recipientValues,
} from "@/shared/lib/placeholders";
import { prisma } from "@/shared/server/db.server";

const PUBLISH_CHUNK = 500;

export interface AnnouncementContent {
	subject: string;
	renderedHtml: string;
}

export const PUBLISHABLE_ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = [
	"SCHEDULED",
	"PUBLISHING",
];

/**
 * Kept apart from `announcements.ts` so the publish worker never reaches the
 * markdown sanitizer, which pulls jsdom in at import time and kills pg-boss
 * startup in production.
 */
export async function deliverAnnouncement(
	id: string,
	content?: AnnouncementContent,
): Promise<{ totalRecipients: number }> {
	const { subject, renderedHtml } = content ?? (await loadContent(id));

	const recipients = await prisma.announcementRecipient.findMany({
		where: { announcementId: id },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			titles: true,
			data: true,
		},
	});
	const publishedAt = new Date();

	for (let i = 0; i < recipients.length; i += PUBLISH_CHUNK) {
		const chunk = recipients.slice(i, i + PUBLISH_CHUNK);
		await prisma.$transaction(
			chunk.map((recipient) => {
				const values = recipientValues({
					...recipient,
					data: parseRecipientData(recipient.data),
				});
				return prisma.announcementRecipient.update({
					where: { id: recipient.id },
					data: {
						renderedSubject: applyPlaceholders(subject, values, false),
						renderedBody: applyPlaceholders(renderedHtml, values, true),
						publishedAt,
					},
				});
			}),
		);
	}

	await prisma.announcement.update({
		where: { id },
		data: { status: "PUBLISHED", publishedAt },
	});

	return { totalRecipients: recipients.length };
}

async function loadContent(id: string): Promise<AnnouncementContent> {
	const row = await prisma.announcement.findUnique({
		where: { id },
		select: { subject: true, renderedHtml: true },
	});
	if (!row) throw new Response("Announcement not found", { status: 404 });
	if (row.renderedHtml === null) {
		const msg = "announcement has no rendered body";
		logger.error(`[announcements] ${id}: ${msg}`);
		throw new Response(msg, { status: 409 });
	}
	return { subject: row.subject, renderedHtml: row.renderedHtml };
}
