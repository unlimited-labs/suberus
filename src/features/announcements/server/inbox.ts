import { prisma } from "@/shared/server/db.server";

const INBOX_LIMIT = 50;

export async function listMyAnnouncements(userId: string) {
	return prisma.announcementRecipient.findMany({
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
}

export async function getMyAnnouncement(userId: string, recipientId: string) {
	const row = await prisma.announcementRecipient.findFirst({
		where: { id: recipientId, userId, publishedAt: { not: null } },
		select: {
			id: true,
			renderedSubject: true,
			renderedBody: true,
			publishedAt: true,
			readAt: true,
		},
	});
	if (!row) throw new Response("Announcement not found", { status: 404 });
	return row;
}

export async function markAnnouncementRead(
	userId: string,
	recipientId: string,
): Promise<void> {
	const { count } = await prisma.announcementRecipient.updateMany({
		where: {
			id: recipientId,
			userId,
			publishedAt: { not: null },
			readAt: null,
		},
		data: { readAt: new Date() },
	});
	if (count === 0) {
		const exists = await prisma.announcementRecipient.count({
			where: { id: recipientId, userId },
		});
		if (exists === 0) {
			throw new Response("Announcement not found", { status: 404 });
		}
	}
}
