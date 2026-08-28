import {
	addMilliseconds,
	addMinutes,
	differenceInMilliseconds,
} from "date-fns";
import { prisma } from "@/shared/server/db.server";
import { getPlannerIncludedTypes } from "./included-types";
import { assertOrderedTimes, overlapWhere, type TimeRange } from "./time-range";
import { parseSeries } from "./tracks";

export interface ProgramSessionDetail {
	id: string;
	title: string;
	trackId: string | null;
	roomId: string | null;
	startAt: Date;
	endAt: Date;
	untimedSlots: boolean;
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
		cancelled: boolean;
		badgeId: string | null;
		submissionTitle: string;
		invited: boolean;
		authors: Array<{ firstName: string; lastName: string; orderIndex: number }>;
	}>;
}

export async function listSessions(
	range?: TimeRange,
): Promise<ProgramSessionDetail[]> {
	const sessions = await prisma.programSession.findMany({
		where: range ? overlapWhere(range) : undefined,
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
							type: true,
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
		untimedSlots: s.untimedSlots,
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
			cancelled: p.cancelled,
			badgeId: p.badgeId,
			submissionTitle: p.submission.title,
			invited: p.submission.type === "INVITED",
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
	untimedSlots?: boolean;
}): Promise<{ id: string }> {
	assertOrderedTimes(data.startAt, data.endAt);
	const title = data.title?.trim() || (await defaultSessionTitle());
	return prisma.programSession.create({
		data: {
			title,
			trackId: data.trackId ?? null,
			roomId: data.roomId ?? null,
			startAt: data.startAt,
			endAt: data.endAt,
			untimedSlots: data.untimedSlots ?? false,
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
		untimedSlots?: boolean;
	},
): Promise<void> {
	assertOrderedTimes(data.startAt, data.endAt);
	await prisma.programSession.update({ where: { id }, data });
}

export async function deleteSession(id: string): Promise<void> {
	await prisma.$transaction(async (tx) => {
		// Slots cascade with the session; their INVITED placeholders would not.
		const invited = await tx.presentationSlot.findMany({
			where: { sessionId: id, submission: { type: "INVITED" } },
			select: { submissionId: true },
		});
		await tx.programSession.delete({ where: { id } });
		if (invited.length > 0) {
			await tx.submission.deleteMany({
				where: { id: { in: invited.map((p) => p.submissionId) } },
			});
		}
	});
}

export async function moveSession(
	id: string,
	data: { startAt: Date; endAt: Date; roomId?: string | null },
): Promise<void> {
	assertOrderedTimes(data.startAt, data.endAt);
	await prisma.programSession.update({
		where: { id },
		data: {
			startAt: data.startAt,
			endAt: data.endAt,
			roomId: data.roomId !== undefined ? data.roomId : undefined,
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
	const includedTypes = await getPlannerIncludedTypes();
	const rows = await prisma.submission.findMany({
		where: {
			status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] },
			type: { in: includedTypes },
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
				untimedSlots: true,
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

		const durationMs = differenceInMilliseconds(current.endAt, current.startAt);
		const newStart = new Date(current.endAt);
		const newEnd = addMilliseconds(newStart, durationMs);

		const created = await tx.programSession.create({
			data: {
				title: `${base} ${nextNum}`,
				trackId: current.trackId,
				roomId: null,
				startAt: newStart,
				endAt: newEnd,
				untimedSlots: current.untimedSlots,
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
				untimedSlots: true,
				presentations: {
					orderBy: { order: "asc" },
					select: { id: true, order: true, durationMin: true },
				},
			},
		});
		if (!current) throw new Error("Session not found");
		if (current.untimedSlots)
			throw new Error(
				"Cannot split a session with untimed presentations — its slots have no times to split on",
			);

		const moved = current.presentations.filter((p) => p.order > afterSlotOrder);
		if (moved.length === 0)
			throw new Error("Cannot split: no presentations after split point");
		const kept = current.presentations.filter((p) => p.order <= afterSlotOrder);
		if (kept.length === 0)
			throw new Error("Cannot split: no presentations before split point");

		const keptDurationMin = kept.reduce((s, p) => s + p.durationMin, 0);
		const movedDurationMin = moved.reduce((s, p) => s + p.durationMin, 0);
		const splitTime = addMinutes(current.startAt, keptDurationMin);
		const newEnd = addMinutes(splitTime, movedDurationMin);

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
	untimedSlots?: boolean;
}): Promise<{ id: string }> {
	assertOrderedTimes(data.startAt, data.endAt);
	const [title, includedTypes] = await Promise.all([
		data.title?.trim()
			? Promise.resolve(data.title.trim())
			: defaultSessionTitle(),
		getPlannerIncludedTypes(),
	]);
	return prisma.$transaction(async (tx) => {
		const valid = await tx.submission.findMany({
			where: {
				id: { in: data.submissionIds },
				status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] },
				type: { in: includedTypes },
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
				untimedSlots: data.untimedSlots ?? false,
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
