import { prisma } from "@/db.server";
import { parseSeries } from "./tracks";

export interface ProgramSessionDetail {
	id: string;
	title: string;
	trackId: string | null;
	roomId: string | null;
	startAt: Date;
	endAt: Date;
	track: { id: string; name: string; color: string | null } | null;
	room: { id: string; name: string } | null;
	chairs: Array<{
		userId: string;
		firstName: string | null;
		lastName: string | null;
	}>;
	presentations: Array<{
		id: string;
		submissionId: string;
		order: number;
		durationMin: number;
		submissionTitle: string;
		authors: Array<{ firstName: string; lastName: string; orderIndex: number }>;
	}>;
}

export async function listSessions(range?: {
	from?: Date;
	to?: Date;
}): Promise<ProgramSessionDetail[]> {
	const sessions = await prisma.programSession.findMany({
		where: range
			? {
					startAt: range.from ? { gte: range.from } : undefined,
					endAt: range.to ? { lte: range.to } : undefined,
				}
			: undefined,
		include: {
			track: { select: { id: true, name: true, color: true } },
			room: { select: { id: true, name: true } },
			chairs: {
				include: {
					user: { select: { id: true, firstName: true, lastName: true } },
				},
			},
			presentations: {
				orderBy: { order: "asc" },
				include: {
					submission: {
						select: {
							title: true,
							authors: {
								select: { firstName: true, lastName: true, orderIndex: true },
								orderBy: { orderIndex: "asc" },
							},
						},
					},
				},
			},
		},
		orderBy: [{ startAt: "asc" }, { roomId: "asc" }],
	});

	return sessions.map((s) => ({
		id: s.id,
		title: s.title,
		trackId: s.trackId,
		roomId: s.roomId,
		startAt: s.startAt,
		endAt: s.endAt,
		track: s.track,
		room: s.room,
		chairs: s.chairs.map((c) => ({
			userId: c.userId,
			firstName: c.user.firstName,
			lastName: c.user.lastName,
		})),
		presentations: s.presentations.map((p) => ({
			id: p.id,
			submissionId: p.submissionId,
			order: p.order,
			durationMin: p.durationMin,
			submissionTitle: p.submission.title,
			authors: p.submission.authors,
		})),
	}));
}

async function defaultSessionTitle(): Promise<string> {
	const count = await prisma.programSession.count();
	return `Session ${count + 1}`;
}

export async function createSession(data: {
	title?: string | null;
	trackId?: string | null;
	roomId?: string | null;
	startAt: Date;
	endAt: Date;
}): Promise<{ id: string }> {
	const title = data.title?.trim() || (await defaultSessionTitle());
	return prisma.programSession.create({
		data: {
			title,
			trackId: data.trackId ?? null,
			roomId: data.roomId ?? null,
			startAt: data.startAt,
			endAt: data.endAt,
		},
		select: { id: true },
	});
}

export async function updateSession(
	id: string,
	data: {
		title?: string;
		trackId?: string | null;
		roomId?: string | null;
		startAt?: Date;
		endAt?: Date;
	},
): Promise<void> {
	await prisma.programSession.update({ where: { id }, data });
}

export async function deleteSession(id: string): Promise<void> {
	await prisma.programSession.delete({ where: { id } });
}

export async function moveSession(
	id: string,
	data: { startAt: Date; endAt: Date; roomId?: string | null },
): Promise<void> {
	await prisma.programSession.update({
		where: { id },
		data: {
			startAt: data.startAt,
			endAt: data.endAt,
			...(data.roomId !== undefined ? { roomId: data.roomId } : {}),
		},
	});
}

export async function assignChair(
	sessionId: string,
	userId: string,
): Promise<void> {
	const count = await prisma.programSessionChair.count({
		where: { sessionId },
	});
	if (count >= 3) throw new Error("Session already has 3 chairs");
	await prisma.programSessionChair.create({ data: { sessionId, userId } });
}

export async function removeChair(
	sessionId: string,
	userId: string,
): Promise<void> {
	await prisma.programSessionChair.delete({
		where: { sessionId_userId: { sessionId, userId } },
	});
}

export interface UnscheduledSubmission {
	id: string;
	title: string;
	type: string;
	abstract: string | null;
	trackId: string | null;
	trackName: string | null;
	keywords: Array<{ id: string; name: string }>;
	authors: Array<{ firstName: string; lastName: string; orderIndex: number }>;
	file: { id: string; originalName: string } | null;
}

export async function listUnscheduledSubmissions(): Promise<
	UnscheduledSubmission[]
> {
	const rows = await prisma.submission.findMany({
		where: {
			status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] },
			type: { in: ["ABSTRACT", "POSTER"] },
			presentationSlot: { is: null },
		},
		select: {
			id: true,
			title: true,
			type: true,
			content: true,
			trackId: true,
			track: { select: { name: true } },
			authors: {
				select: { firstName: true, lastName: true, orderIndex: true },
				orderBy: { orderIndex: "asc" },
			},
			keywords: {
				select: {
					keyword: { select: { id: true, name: true } },
				},
				take: 5,
			},
			currentVersion: {
				select: {
					file: { select: { id: true, originalName: true } },
				},
			},
		},
		orderBy: { createdAt: "asc" },
	});
	return rows.map((r) => ({
		id: r.id,
		title: r.title,
		type: r.type,
		abstract: r.content,
		trackId: r.trackId,
		trackName: r.track?.name ?? null,
		authors: r.authors,
		keywords: r.keywords.map((k) => k.keyword),
		file: r.currentVersion?.file ?? null,
	}));
}

export async function continueSeries(
	sessionId: string,
): Promise<{ id: string }> {
	return prisma.$transaction(async (tx) => {
		const current = await tx.programSession.findUnique({
			where: { id: sessionId },
			select: {
				title: true,
				trackId: true,
				startAt: true,
				endAt: true,
			},
		});
		if (!current) throw new Error("Session not found");

		const parsed = parseSeries(current.title);
		let base: string;
		let nextNum: number;
		if (parsed.series && parsed.seriesOrder !== null) {
			base = parsed.series;
			nextNum = parsed.seriesOrder + 1;
		} else {
			base = current.title;
			nextNum = 2;
			await tx.programSession.update({
				where: { id: sessionId },
				data: { title: `${base} 1` },
			});
		}

		const durationMs = current.endAt.getTime() - current.startAt.getTime();
		const newStart = new Date(current.endAt);
		const newEnd = new Date(newStart.getTime() + durationMs);

		const created = await tx.programSession.create({
			data: {
				title: `${base} ${nextNum}`,
				trackId: current.trackId,
				roomId: null,
				startAt: newStart,
				endAt: newEnd,
			},
			select: { id: true },
		});
		return created;
	});
}

export async function splitSession(
	sessionId: string,
	afterSlotOrder: number,
): Promise<{ id: string }> {
	return prisma.$transaction(async (tx) => {
		const current = await tx.programSession.findUnique({
			where: { id: sessionId },
			select: {
				title: true,
				trackId: true,
				roomId: true,
				startAt: true,
				endAt: true,
				presentations: {
					orderBy: { order: "asc" },
					select: { id: true, order: true, durationMin: true },
				},
			},
		});
		if (!current) throw new Error("Session not found");

		const moved = current.presentations.filter((p) => p.order > afterSlotOrder);
		if (moved.length === 0)
			throw new Error("Cannot split: no presentations after split point");
		const kept = current.presentations.filter((p) => p.order <= afterSlotOrder);
		if (kept.length === 0)
			throw new Error("Cannot split: no presentations before split point");

		const keptDurationMin = kept.reduce((s, p) => s + p.durationMin, 0);
		const movedDurationMin = moved.reduce((s, p) => s + p.durationMin, 0);
		const splitTime = new Date(
			current.startAt.getTime() + keptDurationMin * 60_000,
		);
		const newEnd = new Date(splitTime.getTime() + movedDurationMin * 60_000);

		const newSession = await tx.programSession.create({
			data: {
				title: `${current.title} (2)`,
				trackId: current.trackId,
				roomId: current.roomId,
				startAt: splitTime,
				endAt: newEnd,
			},
			select: { id: true },
		});

		await tx.programSession.update({
			where: { id: sessionId },
			data: { endAt: splitTime },
		});

		await Promise.all(
			moved.map((slot, i) =>
				tx.presentationSlot.update({
					where: { id: slot.id },
					data: { sessionId: newSession.id, order: i },
				}),
			),
		);

		return newSession;
	});
}

export async function createSessionWithPresentations(data: {
	title?: string | null;
	trackId?: string | null;
	roomId?: string | null;
	startAt: Date;
	endAt: Date;
	slotDurationMin: number;
	submissionIds: string[];
}): Promise<{ id: string }> {
	const title = data.title?.trim() || (await defaultSessionTitle());
	return prisma.$transaction(async (tx) => {
		const valid = await tx.submission.findMany({
			where: {
				id: { in: data.submissionIds },
				status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] },
				type: { in: ["ABSTRACT", "POSTER"] },
				presentationSlot: { is: null },
			},
			select: { id: true },
		});
		if (valid.length !== data.submissionIds.length) {
			throw new Error(
				"Some submissions are not accepted, not presentable, or already scheduled",
			);
		}

		const session = await tx.programSession.create({
			data: {
				title,
				trackId: data.trackId ?? null,
				roomId: data.roomId ?? null,
				startAt: data.startAt,
				endAt: data.endAt,
			},
			select: { id: true },
		});

		await tx.presentationSlot.createMany({
			data: data.submissionIds.map((submissionId, idx) => ({
				sessionId: session.id,
				submissionId,
				order: idx,
				durationMin: data.slotDurationMin,
			})),
		});

		return session;
	});
}
