import { prisma } from "@/db.server";

export interface TrackWithStats {
	id: string;
	name: string;
	supervisorId: string | null;
	supervisorName: string | null;
	isActive: boolean;
	submissionCount: number;
}

export interface TrackSimple {
	id: string;
	name: string;
}

/**
 * Get all tracks with submission counts and supervisor info
 */
export async function getAllTracks(): Promise<TrackWithStats[]> {
	const tracks = await prisma.conferenceTrack.findMany({
		include: {
			supervisor: {
				select: { firstName: true, lastName: true },
			},
			_count: {
				select: { submissions: true },
			},
		},
		orderBy: { createdAt: "desc" },
	});

	return tracks.map((track) => ({
		id: track.id,
		name: track.name,
		supervisorId: track.supervisorId,
		supervisorName: track.supervisor
			? `${track.supervisor.firstName} ${track.supervisor.lastName}`.trim()
			: null,
		isActive: track.isActive,
		submissionCount: track._count.submissions,
	}));
}

/**
 * Create a new track
 */
export async function createTrack(
	name: string,
	supervisorId?: string,
): Promise<{ id: string }> {
	const track = await prisma.conferenceTrack.create({
		data: {
			name,
			supervisorId: supervisorId || null,
			isActive: true,
		},
		select: { id: true },
	});

	return track;
}

/**
 * Update a track
 */
export async function updateTrack(
	id: string,
	data: {
		name?: string;
		supervisorId?: string | null;
		isActive?: boolean;
	},
): Promise<void> {
	await prisma.conferenceTrack.update({
		where: { id },
		data,
	});
}

/**
 * Delete a track (only if no submissions)
 */
export async function deleteTrack(id: string): Promise<void> {
	// Check submission count
	const track = await prisma.conferenceTrack.findUnique({
		where: { id },
		include: {
			_count: {
				select: { submissions: true },
			},
		},
	});

	if (!track) {
		throw new Error("Track not found");
	}

	if (track._count.submissions > 0) {
		throw new Error(
			`Cannot delete track with ${track._count.submissions} submission(s)`,
		);
	}

	await prisma.conferenceTrack.delete({
		where: { id },
	});
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
