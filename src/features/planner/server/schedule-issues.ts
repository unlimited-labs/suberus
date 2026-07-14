/** Pure schedule-conflict detection (no DB/IO — unit-testable). */

export type IssueKind =
	| "CHAIR_OVERLAP"
	| "AUTHOR_TIME_CLASH"
	| "PRESENTER_PARALLEL_SESSION"
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

/** Half-open time-interval overlap. */
export function overlaps(
	a: { startAt: Date; endAt: Date },
	b: { startAt: Date; endAt: Date },
): boolean {
	return a.startAt < b.endAt && a.endAt > b.startAt;
}

export interface NamedPerson {
	firstName: string | null;
	lastName: string | null;
	email: string;
}

export function personName(p: NamedPerson | null | undefined): string {
	if (!p) return "Unknown";
	const first = (p.firstName ?? "").trim();
	const last = (p.lastName ?? "").trim();
	const full = `${first} ${last}`.trim();
	return full || p.email || "Unknown";
}

/** Minimal session shape needed for overlap detection. */
export interface OverlapSession {
	id: string;
	title: string;
	roomId: string | null;
	startAt: Date;
	endAt: Date;
	chairs: { userId: string; user: NamedPerson }[];
	presentations: {
		submission: {
			authors: {
				userId: string | null;
				firstName: string;
				lastName: string;
				email: string;
			}[];
		};
	}[];
}

type ChairSet = Set<string>;

function buildChairSet(s: OverlapSession): ChairSet {
	return new Set(s.chairs.map((c) => c.userId));
}

export function authorKey(au: {
	userId: string | null;
	email: string;
}): string {
	return au.userId ?? `email:${au.email}`;
}

export function detectChairOverlap(
	a: OverlapSession,
	b: OverlapSession,
	chairsOfA: ChairSet,
): ScheduleIssue | null {
	const clashes: string[] = [];
	const seen = new Set<string>();
	for (const c of b.chairs) {
		if (chairsOfA.has(c.userId) && !seen.has(c.userId)) {
			seen.add(c.userId);
			clashes.push(personName(c.user));
		}
	}
	if (clashes.length === 0) return null;
	return {
		kind: "CHAIR_OVERLAP",
		message: `${clashes.join(", ")} chair${clashes.length === 1 ? "s" : ""} overlapping sessions "${a.title}" and "${b.title}"`,
		sessionIds: [a.id, b.id],
	};
}

export function detectRoomDoubleBooking(
	a: OverlapSession,
	b: OverlapSession,
): ScheduleIssue | null {
	if (!a.roomId || a.roomId !== b.roomId) return null;
	return {
		kind: "ROOM_DOUBLE_BOOKED",
		message: `Room double-booked: "${a.title}" vs "${b.title}"`,
		sessionIds: [a.id, b.id],
	};
}

/** Chair / room conflicts across overlapping session pairs (author clashes: author-conflicts.ts). */
export function findPairwiseOverlapIssues(
	sessions: OverlapSession[],
): ScheduleIssue[] {
	const chairSets = sessions.map(buildChairSet);

	const issues: ScheduleIssue[] = [];
	for (let i = 0; i < sessions.length; i++) {
		const a = sessions[i];
		for (let j = i + 1; j < sessions.length; j++) {
			const b = sessions[j];
			if (!overlaps(a, b)) continue;
			const found = [
				detectChairOverlap(a, b, chairSets[i]),
				detectRoomDoubleBooking(a, b),
			];
			for (const issue of found) {
				if (issue) issues.push(issue);
			}
		}
	}
	return issues;
}
