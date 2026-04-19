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
