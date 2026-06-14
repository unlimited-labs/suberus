import { prisma } from "@/db.server";

export interface TrackSimple {
	id: string;
	name: string;
}

/**
 * Get active tracks for user selection
 */
export async function getActiveTracks(): Promise<TrackSimple[]> {
	const tracks = await prisma.conferenceTrack.findMany({
		where: { isActive: true },
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});

	return tracks;
}
