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
	sessions: number;
	sessionMinutes: number;
	usedMinutes: number;
	freeMinutes: number;
}

export async function getCapacity(): Promise<CapacityInfo> {
	const [talks, sessionsList, slotsList] = await Promise.all([
		prisma.submission.count({
			where: {
				status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] },
				type: { in: ["ABSTRACT", "POSTER"] },
			},
		}),
		prisma.programSession.findMany({ select: { startAt: true, endAt: true } }),
		prisma.presentationSlot.findMany({ select: { durationMin: true } }),
	]);

	const sessionMinutes = sessionsList.reduce(
		(sum, s) => sum + (s.endAt.getTime() - s.startAt.getTime()) / 60_000,
		0,
	);
	const usedMinutes = slotsList.reduce((sum, s) => sum + s.durationMin, 0);
	const freeMinutes = Math.max(0, sessionMinutes - usedMinutes);

	return {
		talks,
		scheduled: slotsList.length,
		sessions: sessionsList.length,
		sessionMinutes: Math.round(sessionMinutes),
		usedMinutes,
		freeMinutes: Math.round(freeMinutes),
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

function personName(
	p:
		| { firstName: string | null; lastName: string | null; email: string }
		| { firstName: string; lastName: string; email: string }
		| null
		| undefined,
): string {
	if (!p) return "Unknown";
	const first = (p.firstName ?? "").trim();
	const last = (p.lastName ?? "").trim();
	const full = `${first} ${last}`.trim();
	return full || p.email || "Unknown";
}

export async function getScheduleIssues(): Promise<ScheduleIssue[]> {
	const [sessions, breaks] = await Promise.all([
		prisma.programSession.findMany({
			include: {
				chairs: {
					include: {
						user: { select: { firstName: true, lastName: true, email: true } },
					},
				},
				presentations: {
					include: {
						submission: {
							select: {
								title: true,
								status: true,
								authors: {
									select: {
										userId: true,
										firstName: true,
										lastName: true,
										email: true,
									},
								},
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
				message: `Session "${s.title}" is over-booked: ${totalMin} min of talks scheduled, only ${sessionMin} min available`,
				sessionIds: [s.id],
			});
		}
	}

	// 6. Non-accepted submissions
	for (const s of sessions) {
		for (const p of s.presentations) {
			const st = p.submission.status;
			if (st !== "ACCEPTED" && st !== "CONDITIONALLY_ACCEPTED") {
				const statusLabel = st.replace(/_/g, " ").toLowerCase();
				issues.push({
					kind: "NON_ACCEPTED_SUBMISSION",
					message: `"${p.submission.title}" in session "${s.title}" is ${statusLabel} (not accepted)`,
					sessionIds: [s.id],
				});
			}
		}
	}

	// Pre-compute per-session chair/author maps once (invariant across j-loop).
	const chairMaps = sessions.map((s) => {
		const m = new Set<string>();
		for (const c of s.chairs) m.add(c.userId);
		return m;
	});
	const authorMaps = sessions.map((s) => {
		const m = new Map<
			string,
			{ firstName: string; lastName: string; email: string }
		>();
		for (const p of s.presentations) {
			for (const au of p.submission.authors) {
				const key = au.userId ?? `email:${au.email}`;
				if (!m.has(key)) m.set(key, au);
			}
		}
		return m;
	});

	// 1 & 2 & 3. Pairwise overlaps
	const n = sessions.length;
	for (let i = 0; i < n; i++) {
		const a = sessions[i];
		const aChairSet = chairMaps[i];
		const aAuthors = authorMaps[i];
		for (let j = i + 1; j < n; j++) {
			const b = sessions[j];
			if (!overlaps(a, b)) continue;

			// Chair overlap (dedup per pair)
			const chairClashes: string[] = [];
			const seenChairKeys = new Set<string>();
			for (const c of b.chairs) {
				if (aChairSet.has(c.userId) && !seenChairKeys.has(c.userId)) {
					seenChairKeys.add(c.userId);
					chairClashes.push(personName(c.user));
				}
			}
			if (chairClashes.length > 0) {
				issues.push({
					kind: "CHAIR_OVERLAP",
					message: `${chairClashes.join(", ")} chair${chairClashes.length === 1 ? "s" : ""} overlapping sessions "${a.title}" and "${b.title}"`,
					sessionIds: [a.id, b.id],
				});
			}

			// Room double-booked (sessions)
			if (a.roomId && a.roomId === b.roomId) {
				issues.push({
					kind: "ROOM_DOUBLE_BOOKED",
					message: `Room double-booked: "${a.title}" vs "${b.title}"`,
					sessionIds: [a.id, b.id],
				});
			}

			// Author overlap (dedup per pair, via userId or email fallback)
			const authorClashes: string[] = [];
			const seenAuthorKeys = new Set<string>();
			for (const p of b.presentations) {
				for (const au of p.submission.authors) {
					const key = au.userId ?? `email:${au.email}`;
					if (aAuthors.has(key) && !seenAuthorKeys.has(key)) {
						seenAuthorKeys.add(key);
						authorClashes.push(personName(au));
					}
				}
			}
			if (authorClashes.length > 0) {
				issues.push({
					kind: "AUTHOR_OVERLAP",
					message: `${authorClashes.join(", ")} presenting in overlapping sessions "${a.title}" and "${b.title}"`,
					sessionIds: [a.id, b.id],
				});
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
