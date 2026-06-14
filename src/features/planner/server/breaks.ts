import { prisma } from "@/shared/server/db.server";

export async function listBreaks() {
	return prisma.scheduleBreak.findMany({
		include: { room: { select: { id: true, name: true } } },
		orderBy: { startAt: "asc" },
	});
}

export async function createBreak(data: {
	title: string;
	roomId?: string | null;
	startAt: Date;
	endAt: Date;
}): Promise<{ id: string }> {
	return prisma.scheduleBreak.create({
		data: {
			title: data.title,
			roomId: data.roomId ?? null,
			startAt: data.startAt,
			endAt: data.endAt,
		},
		select: { id: true },
	});
}

export async function updateBreak(
	id: string,
	data: {
		title?: string;
		roomId?: string | null;
		startAt?: Date;
		endAt?: Date;
	},
): Promise<void> {
	await prisma.scheduleBreak.update({ where: { id }, data });
}

export async function deleteBreak(id: string): Promise<void> {
	await prisma.scheduleBreak.delete({ where: { id } });
}
