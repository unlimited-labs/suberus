import { prisma } from "@/shared/server/db.server";

// A duplicate name is a user error, but Prisma reports it as P2002 — which the
// server-fn sanitizer replaces with the generic message, hiding the cause.
function isDuplicateName(error: unknown): boolean {
	// name is this model's only unique constraint, so any P2002 is that one.
	return (
		error instanceof Error && (error as { code?: unknown }).code === "P2002"
	);
}

const DUPLICATE_NAME = "A track with this name already exists";

export interface TrackWithStats {
	id: string;
	name: string;
	supervisorId: string | null;
	supervisorName: string | null;
	isActive: boolean;
	submissionCount: number;
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
	try {
		return await prisma.conferenceTrack.create({
			data: {
				name,
				supervisorId: supervisorId || null,
				isActive: true,
			},
			select: { id: true },
		});
	} catch (error) {
		if (isDuplicateName(error)) throw new Error(DUPLICATE_NAME);
		throw error;
	}
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
	try {
		await prisma.conferenceTrack.update({
			where: { id },
			data,
		});
	} catch (error) {
		if (isDuplicateName(error)) throw new Error(DUPLICATE_NAME);
		throw error;
	}
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
