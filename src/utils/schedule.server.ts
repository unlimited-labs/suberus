import { prisma } from "@/db.server";
import { getSetting, setSetting } from "./settings.server";

export type ScheduleStatus = "DRAFT" | "PUBLISHED";

export interface ScheduleState {
	status: ScheduleStatus;
	publishedAt?: string;
	publishedBy?: string;
}

export async function getScheduleState(): Promise<ScheduleState> {
	return getSetting("SCHEDULE_STATE");
}

export async function publishSchedule(userId: string): Promise<void> {
	await setSetting("SCHEDULE_STATE", {
		status: "PUBLISHED",
		publishedAt: new Date().toISOString(),
		publishedBy: userId,
	});
}

export async function unpublishSchedule(): Promise<void> {
	await setSetting("SCHEDULE_STATE", { status: "DRAFT" });
}

export interface CapacityInfo {
	talks: number;
	scheduled: number;
	rooms: number;
	days: number;
	hoursPerDay: number;
	slotMinutes: number;
	theoreticalSlots: number;
	utilizationPct: number;
}

export async function getCapacity(): Promise<CapacityInfo> {
	const [
		talks,
		scheduled,
		rooms,
		conferenceStart,
		conferenceEnd,
		dayStart,
		dayEnd,
		defaultSlotMin,
	] = await Promise.all([
		prisma.submission.count({
			where: { status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] } },
		}),
		prisma.presentationSlot.count(),
		prisma.room.count(),
		getSetting("CONFERENCE_DATE_START"),
		getSetting("CONFERENCE_DATE_END"),
		getSetting("CONFERENCE_DAY_START"),
		getSetting("CONFERENCE_DAY_END"),
		getSetting("CONFERENCE_DEFAULT_PRESENTATION_MIN"),
	]);

	const days =
		conferenceStart && conferenceEnd
			? Math.max(
					1,
					Math.round(
						(new Date(conferenceEnd).getTime() -
							new Date(conferenceStart).getTime()) /
							86_400_000,
					) + 1,
				)
			: 1;

	const parseHours = (hhmm: string | null | undefined): number => {
		if (!hhmm) return 0;
		const [h, m] = hhmm.split(":").map(Number);
		return h + (m || 0) / 60;
	};
	const hoursPerDay = Math.max(
		0,
		parseHours(dayEnd as string) - parseHours(dayStart as string),
	);
	const slotMinutes = defaultSlotMin || 15;
	const theoreticalSlots = Math.floor(
		(days * rooms * hoursPerDay * 60) / slotMinutes,
	);
	const utilizationPct =
		theoreticalSlots > 0 ? Math.round((scheduled / theoreticalSlots) * 100) : 0;

	return {
		talks,
		scheduled,
		rooms,
		days,
		hoursPerDay,
		slotMinutes,
		theoreticalSlots,
		utilizationPct,
	};
}

export interface PublicProgramSession {
	id: string;
	title: string;
	startAt: Date;
	endAt: Date;
	room: { id: string; name: string } | null;
	track: { id: string; name: string; color: string | null } | null;
	chairs: Array<{ firstName: string | null; lastName: string | null }>;
	presentations: Array<{
		id: string;
		order: number;
		durationMin: number;
		submissionTitle: string;
		authors: Array<{ firstName: string; lastName: string; orderIndex: number }>;
	}>;
}

export interface PublicProgramBreak {
	id: string;
	title: string;
	startAt: Date;
	endAt: Date;
	room: { id: string; name: string } | null;
}

export interface PublicProgram {
	sessions: PublicProgramSession[];
	breaks: PublicProgramBreak[];
}

export async function getPublicProgram(): Promise<PublicProgram | null> {
	const state = await getSetting("SCHEDULE_STATE");
	if (state.status !== "PUBLISHED") return null;

	const [sessions, breaks] = await Promise.all([
		prisma.programSession.findMany({
			include: {
				room: { select: { id: true, name: true } },
				track: { select: { id: true, name: true, color: true } },
				chairs: {
					include: { user: { select: { firstName: true, lastName: true } } },
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
		}),
		prisma.scheduleBreak.findMany({
			include: { room: { select: { id: true, name: true } } },
			orderBy: { startAt: "asc" },
		}),
	]);

	return {
		sessions: sessions.map((s) => ({
			id: s.id,
			title: s.title,
			startAt: s.startAt,
			endAt: s.endAt,
			room: s.room,
			track: s.track,
			chairs: s.chairs.map((c) => ({
				firstName: c.user.firstName,
				lastName: c.user.lastName,
			})),
			presentations: s.presentations.map((p) => ({
				id: p.id,
				order: p.order,
				durationMin: p.durationMin,
				submissionTitle: p.submission.title,
				authors: p.submission.authors,
			})),
		})),
		breaks: breaks.map((b) => ({
			id: b.id,
			title: b.title,
			startAt: b.startAt,
			endAt: b.endAt,
			room: b.room,
		})),
	};
}

export type IssueKind =
	| "CHAIR_OVERLAP"
	| "AUTHOR_OVERLAP"
	| "ROOM_DOUBLE_BOOKED"
	| "SLOT_DURATION_OVERFLOW"
	| "SESSION_WITHOUT_CHAIR"
	| "NON_ACCEPTED_SUBMISSION"
	| "SESSION_OUT_OF_BOUNDS";

export interface ScheduleIssue {
	kind: IssueKind;
	message: string;
	sessionIds: string[];
}

function overlaps(
	a: { startAt: Date; endAt: Date },
	b: { startAt: Date; endAt: Date },
): boolean {
	return a.startAt < b.endAt && a.endAt > b.startAt;
}

export async function getScheduleIssues(): Promise<ScheduleIssue[]> {
	const [sessions, breaks] = await Promise.all([
		prisma.programSession.findMany({
			include: {
				chairs: { select: { userId: true } },
				presentations: {
					include: {
						submission: {
							select: {
								status: true,
								authors: { select: { userId: true, email: true } },
							},
						},
					},
				},
			},
		}),
		prisma.scheduleBreak.findMany({
			select: {
				id: true,
				roomId: true,
				startAt: true,
				endAt: true,
				title: true,
			},
		}),
	]);

	const issues: ScheduleIssue[] = [];

	// 5. Session without chair
	for (const s of sessions) {
		if (s.chairs.length === 0) {
			issues.push({
				kind: "SESSION_WITHOUT_CHAIR",
				message: `Session "${s.title}" has no chair`,
				sessionIds: [s.id],
			});
		}
	}

	// 4. Slot durations exceed session length
	for (const s of sessions) {
		const totalMin = s.presentations.reduce((a, p) => a + p.durationMin, 0);
		const sessionMin = (s.endAt.getTime() - s.startAt.getTime()) / 60000;
		if (totalMin > sessionMin) {
			issues.push({
				kind: "SLOT_DURATION_OVERFLOW",
				message: `Session "${s.title}" slots total ${totalMin}min > ${sessionMin}min`,
				sessionIds: [s.id],
			});
		}
	}

	// 6. Non-accepted submissions
	for (const s of sessions) {
		for (const p of s.presentations) {
			const st = p.submission.status;
			if (st !== "ACCEPTED" && st !== "CONDITIONALLY_ACCEPTED") {
				issues.push({
					kind: "NON_ACCEPTED_SUBMISSION",
					message: `Slot in "${s.title}" references ${st} submission`,
					sessionIds: [s.id],
				});
			}
		}
	}

	// 1 & 2 & 3. Pairwise overlaps
	for (let i = 0; i < sessions.length; i++) {
		for (let j = i + 1; j < sessions.length; j++) {
			const a = sessions[i];
			const b = sessions[j];
			if (!overlaps(a, b)) continue;

			// Chair overlap
			const aChairs = new Set(a.chairs.map((c) => c.userId));
			for (const c of b.chairs) {
				if (aChairs.has(c.userId)) {
					issues.push({
						kind: "CHAIR_OVERLAP",
						message: `Chair ${c.userId} in overlapping sessions`,
						sessionIds: [a.id, b.id],
					});
				}
			}

			// Room double-booked (sessions)
			if (a.roomId && a.roomId === b.roomId) {
				issues.push({
					kind: "ROOM_DOUBLE_BOOKED",
					message: `Room double-booked: "${a.title}" vs "${b.title}"`,
					sessionIds: [a.id, b.id],
				});
			}

			// Author overlap (via user or email fallback)
			const aAuthors = new Set<string>();
			for (const p of a.presentations) {
				for (const au of p.submission.authors) {
					aAuthors.add(au.userId ?? `email:${au.email}`);
				}
			}
			for (const p of b.presentations) {
				for (const au of p.submission.authors) {
					const key = au.userId ?? `email:${au.email}`;
					if (aAuthors.has(key)) {
						issues.push({
							kind: "AUTHOR_OVERLAP",
							message: `Author ${key} in overlapping sessions`,
							sessionIds: [a.id, b.id],
						});
					}
				}
			}
		}
	}

	// Room double-booked: session vs break
	for (const s of sessions) {
		if (!s.roomId) continue;
		for (const b of breaks) {
			if (b.roomId !== s.roomId) continue;
			if (overlaps(s, b)) {
				issues.push({
					kind: "ROOM_DOUBLE_BOOKED",
					message: `Break "${b.title}" overlaps session "${s.title}" in room`,
					sessionIds: [s.id],
				});
			}
		}
	}

	return issues;
}
