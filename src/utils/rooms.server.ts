import { prisma } from "@/db.server";

export interface RoomWithStats {
	id: string;
	name: string;
	capacity: number | null;
	order: number;
	sessionCount: number;
	breakCount: number;
}

export async function getAllRooms(): Promise<RoomWithStats[]> {
	const rooms = await prisma.room.findMany({
		include: {
			_count: {
				select: { programSessions: true, breaks: true },
			},
		},
		orderBy: [{ order: "asc" }, { name: "asc" }],
	});

	return rooms.map((r) => ({
		id: r.id,
		name: r.name,
		capacity: r.capacity,
		order: r.order,
		sessionCount: r._count.programSessions,
		breakCount: r._count.breaks,
	}));
}

export async function createRoom(data: {
	name: string;
	capacity?: number | null;
	order?: number;
}): Promise<{ id: string }> {
	return prisma.room.create({
		data: {
			name: data.name,
			capacity: data.capacity ?? null,
			order: data.order ?? 0,
		},
		select: { id: true },
	});
}

export async function updateRoom(
	id: string,
	data: { name?: string; capacity?: number | null; order?: number },
): Promise<void> {
	await prisma.room.update({ where: { id }, data });
}

export async function deleteRoom(id: string): Promise<void> {
	await prisma.room.delete({ where: { id } });
}
