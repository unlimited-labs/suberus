import {
	applyPlaceholders,
	parseRecipientData,
	recipientValues,
} from "@/shared/lib/placeholders";
import { prisma } from "@/shared/server/db.server";
import type { PublishedAnnouncementBody } from "./inbox";
import { markdownToAnnouncementHtml } from "./sanitize";

export interface UserAnnouncement extends PublishedAnnouncementBody {
	fromCampaign: boolean;
}

export async function listUserAnnouncements(
	userId: string,
): Promise<UserAnnouncement[]> {
	const rows = await prisma.announcementRecipient.findMany({
		where: { userId, publishedAt: { not: null } },
		select: {
			id: true,
			renderedSubject: true,
			renderedBody: true,
			publishedAt: true,
			readAt: true,
			announcement: { select: { sourceCampaignId: true } },
		},
		orderBy: { publishedAt: "desc" },
	});
	return rows.flatMap((row) =>
		row.publishedAt === null ||
		row.renderedSubject === null ||
		row.renderedBody === null
			? []
			: [
					{
						id: row.id,
						subject: row.renderedSubject,
						body: row.renderedBody,
						publishedAt: row.publishedAt,
						readAt: row.readAt,
						fromCampaign: row.announcement.sourceCampaignId !== null,
					},
				],
	);
}

/** The markdown to seed the per-recipient editor with: their override, or the
 * announcement's own body with this recipient's placeholders already resolved. */
export async function getRecipientDraft(recipientId: string) {
	const row = await prisma.announcementRecipient.findUnique({
		where: { id: recipientId },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			titles: true,
			data: true,
			renderedSubject: true,
			bodySourceOverride: true,
			publishedAt: true,
			announcement: {
				select: { subject: true, bodySource: true, sourceCampaignId: true },
			},
		},
	});
	if (!row) throw new Response("Recipient not found", { status: 404 });
	if (row.publishedAt === null) {
		throw new Response("Announcement is still a draft", { status: 409 });
	}
	// The body of a campaign copy is MJML or plain text, which this markdown
	// editor would mangle on save; only a real announcement is editable.
	if (row.announcement.sourceCampaignId !== null) {
		throw new Response("An email copy cannot be edited", { status: 409 });
	}
	const values = recipientValues({
		...row,
		data: parseRecipientData(row.data),
	});
	return {
		recipientId: row.id,
		subject:
			row.renderedSubject ??
			applyPlaceholders(row.announcement.subject, values, false),
		bodySource:
			row.bodySourceOverride ??
			applyPlaceholders(row.announcement.bodySource, values, false),
	};
}

export async function updateAnnouncementRecipient(input: {
	recipientId: string;
	subject: string;
	bodySource: string;
}): Promise<void> {
	const row = await prisma.announcementRecipient.findUnique({
		where: { id: input.recipientId },
		select: {
			publishedAt: true,
			announcement: { select: { sourceCampaignId: true } },
		},
	});
	if (!row) throw new Response("Recipient not found", { status: 404 });
	if (row.publishedAt === null) {
		throw new Response("Announcement is still a draft", { status: 409 });
	}
	if (row.announcement.sourceCampaignId !== null) {
		throw new Response("An email copy cannot be edited", { status: 409 });
	}
	await prisma.announcementRecipient.update({
		where: { id: input.recipientId },
		data: {
			bodySourceOverride: input.bodySource,
			renderedSubject: input.subject,
			renderedBody: markdownToAnnouncementHtml(input.bodySource),
		},
	});
}
