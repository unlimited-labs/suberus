import type { ScheduleItemKind } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";

export async function listBreaks() {
	return prisma.scheduleBreak.findMany({
		include: { room: { select: { id: true, name: true } } },
		orderBy: { startAt: "asc" },
	});
}

export async function createBreak(data: {
	kind?: ScheduleItemKind;
	title: string;
	description?: string | null;
	location?: string | null;
	locationUrl?: string | null;
	roomId?: string | null;
	startAt: Date;
	endAt: Date;
}): Promise<{ id: string }> {
	return prisma.scheduleBreak.create({
		data: {
			kind: data.kind ?? "BREAK",
			title: data.title,
			description: data.description ?? null,
			location: data.location ?? null,
			locationUrl: data.locationUrl ?? null,
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
		description?: string | null;
		location?: string | null;
		locationUrl?: string | null;
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
