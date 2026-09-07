import { logger } from "@/logger.ts";
import { prisma } from "@/shared/server/db.server";

const INBOX_LIMIT = 50;

/**
 * What a reader is allowed to see. `publishAnnouncement` and the campaign worker
 * write subject, body and publishedAt together, so a row with one and not the
 * others is a bug — parsed here rather than defaulted at every use site.
 */
export interface PublishedAnnouncement {
	id: string;
	subject: string;
	publishedAt: Date;
	readAt: Date | null;
}

export interface PublishedAnnouncementBody extends PublishedAnnouncement {
	body: string;
}

interface RecipientRow {
	id: string;
	renderedSubject: string | null;
	renderedBody?: string | null;
	publishedAt: Date | null;
	readAt: Date | null;
}

function toPublished(row: RecipientRow): PublishedAnnouncement | null {
	if (row.publishedAt === null || row.renderedSubject === null) {
		logger.warn(`[announcements] recipient ${row.id} is published but empty`);
		return null;
	}
	return {
		id: row.id,
		subject: row.renderedSubject,
		publishedAt: row.publishedAt,
		readAt: row.readAt,
	};
}

export async function listMyAnnouncements(
	userId: string,
): Promise<PublishedAnnouncement[]> {
	const rows = await prisma.announcementRecipient.findMany({
		where: { userId, publishedAt: { not: null } },
		select: {
			id: true,
			renderedSubject: true,
			publishedAt: true,
			readAt: true,
		},
		orderBy: { publishedAt: "desc" },
		take: INBOX_LIMIT,
	});
	return rows.flatMap((row) => {
		const parsed = toPublished(row);
		return parsed ? [parsed] : [];
	});
}

export async function getMyAnnouncement(input: {
	userId: string;
	recipientId: string;
}): Promise<PublishedAnnouncementBody> {
	const row = await prisma.announcementRecipient.findFirst({
		where: {
			id: input.recipientId,
			userId: input.userId,
			publishedAt: { not: null },
		},
		select: {
			id: true,
			renderedSubject: true,
			renderedBody: true,
			publishedAt: true,
			readAt: true,
		},
	});
	const parsed = row ? toPublished(row) : null;
	if (!row || !parsed || row.renderedBody === null) {
		throw new Response("Announcement not found", { status: 404 });
	}
	return { ...parsed, body: row.renderedBody };
}

export async function markAnnouncementRead(input: {
	userId: string;
	recipientId: string;
}): Promise<void> {
	const { count } = await prisma.announcementRecipient.updateMany({
		where: {
			id: input.recipientId,
			userId: input.userId,
			publishedAt: { not: null },
			readAt: null,
		},
		data: { readAt: new Date() },
	});
	if (count > 0) return;
	const exists = await prisma.announcementRecipient.count({
		where: { id: input.recipientId, userId: input.userId },
	});
	if (exists === 0) {
		throw new Response("Announcement not found", { status: 404 });
	}
}
