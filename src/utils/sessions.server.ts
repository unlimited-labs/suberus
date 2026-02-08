import { prisma } from "@/db";

export interface SessionWithStats {
	id: string;
	name: string;
	supervisorId: string | null;
	supervisorName: string | null;
	isActive: boolean;
	submissionCount: number;
}

export interface SessionSimple {
	id: string;
	name: string;
}

export interface ReviewerUser {
	id: string;
	name: string;
	email: string;
}

/**
 * Get all sessions with submission counts and supervisor info
 */
export async function getAllSessions(): Promise<SessionWithStats[]> {
	const sessions = await prisma.conferenceSession.findMany({
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

	return sessions.map((session) => ({
		id: session.id,
		name: session.name,
		supervisorId: session.supervisorId,
		supervisorName: session.supervisor
			? `${session.supervisor.firstName} ${session.supervisor.lastName}`.trim()
			: null,
		isActive: session.isActive,
		submissionCount: session._count.submissions,
	}));
}

/**
 * Create a new session
 */
export async function createSession(
	name: string,
	supervisorId?: string,
): Promise<{ id: string }> {
	const session = await prisma.conferenceSession.create({
		data: {
			name,
			supervisorId: supervisorId || null,
			isActive: true,
		},
		select: { id: true },
	});

	return session;
}

/**
 * Update a session
 */
export async function updateSession(
	id: string,
	data: {
		name?: string;
		supervisorId?: string | null;
		isActive?: boolean;
	},
): Promise<void> {
	await prisma.conferenceSession.update({
		where: { id },
		data,
	});
}

/**
 * Delete a session (only if no submissions)
 */
export async function deleteSession(id: string): Promise<void> {
	// Check submission count
	const session = await prisma.conferenceSession.findUnique({
		where: { id },
		include: {
			_count: {
				select: { submissions: true },
			},
		},
	});

	if (!session) {
		throw new Error("Session not found");
	}

	if (session._count.submissions > 0) {
		throw new Error(
			`Cannot delete session with ${session._count.submissions} submission(s)`,
		);
	}

	await prisma.conferenceSession.delete({
		where: { id },
	});
}

/**
 * Get active sessions for user selection
 */
export async function getActiveSessions(): Promise<SessionSimple[]> {
	const sessions = await prisma.conferenceSession.findMany({
		where: { isActive: true },
		select: { id: true, name: true },
		orderBy: { name: "asc" },
	});

	return sessions;
}

/**
 * Get users eligible as session supervisors (REVIEWER, EDITOR, ADMIN)
 */
export async function getReviewerUsers(): Promise<ReviewerUser[]> {
	const users = await prisma.user.findMany({
		where: {
			role: {
				in: ["REVIEWER", "EDITOR", "ADMIN"],
			},
			isActive: true,
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
		},
		orderBy: { firstName: "asc" },
	});

	return users.map((user) => ({
		id: user.id,
		name: `${user.firstName} ${user.lastName}`.trim(),
		email: user.email,
	}));
}
