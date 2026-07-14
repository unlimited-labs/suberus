import {
	authorKey,
	type NamedPerson,
	overlaps,
	personName,
	type ScheduleIssue,
} from "./schedule-issues";
import { slotStartAt } from "./slot-timing";

interface ConflictAuthor extends NamedPerson {
	userId: string | null;
	isPresenter: boolean;
}

export interface ConflictSession {
	id: string;
	title: string;
	startAt: Date;
	endAt: Date;
	presentations: {
		order: number;
		durationMin: number;
		submission: {
			id: string;
			title: string;
			authors: ConflictAuthor[];
		};
	}[];
}

interface Talk {
	key: string;
	sessionId: string;
	title: string;
	start: Date;
	end: Date;
	authors: ConflictAuthor[];
}

function buildTalks(sessions: ConflictSession[]): Talk[] {
	const talks: Talk[] = [];
	for (const s of sessions) {
		const slots = s.presentations.map((p) => ({
			order: p.order,
			durationMin: p.durationMin,
		}));
		for (const p of s.presentations) {
			const start = slotStartAt(s.startAt, slots, p.order);
			talks.push({
				key: p.submission.id,
				sessionId: s.id,
				title: p.submission.title,
				start,
				end: new Date(start.getTime() + p.durationMin * 60_000),
				authors: p.submission.authors,
			});
		}
	}
	return talks;
}

function withinBuffer(a: Talk, b: Talk, bufferMs: number): boolean {
	return (
		a.start.getTime() < b.end.getTime() + bufferMs &&
		b.start.getTime() < a.end.getTime() + bufferMs
	);
}

/** Rule A: a shared author cannot have two talks in different sessions within `bufferMin` of each other. */
export function detectAuthorTimeClashes(
	sessions: ConflictSession[],
	bufferMin: number,
): ScheduleIssue[] {
	const talks = buildTalks(sessions);
	const bufferMs = bufferMin * 60_000;

	const byAuthor = new Map<string, Talk[]>();
	const authorPerson = new Map<string, ConflictAuthor>();
	for (const t of talks) {
		for (const au of t.authors) {
			const k = authorKey(au);
			if (!authorPerson.has(k)) authorPerson.set(k, au);
			const arr = byAuthor.get(k);
			if (arr) arr.push(t);
			else byAuthor.set(k, [t]);
		}
	}

	const pairs = new Map<string, { a: Talk; b: Talk; authors: Set<string> }>();
	for (const [k, list] of byAuthor) {
		if (list.length < 2) continue;
		list.sort((x, y) => x.start.getTime() - y.start.getTime());
		for (let i = 0; i < list.length; i++) {
			const a = list[i];
			for (let j = i + 1; j < list.length; j++) {
				const b = list[j];
				if (b.start.getTime() >= a.end.getTime() + bufferMs) break;
				if (a.sessionId === b.sessionId) continue;
				if (!withinBuffer(a, b, bufferMs)) continue;
				const pk = a.key < b.key ? `${a.key}|${b.key}` : `${b.key}|${a.key}`;
				const entry = pairs.get(pk);
				if (entry) entry.authors.add(k);
				else pairs.set(pk, { a, b, authors: new Set([k]) });
			}
		}
	}

	return [...pairs.values()].map(({ a, b, authors }) => ({
		kind: "AUTHOR_TIME_CLASH",
		message: `${[...authors]
			.map((k) => personName(authorPerson.get(k)))
			.join(", ")} has near-overlapping talks "${a.title}" and "${b.title}"`,
		sessionIds: [a.sessionId, b.sessionId],
	}));
}

/** Rule B: a presenter must not present in two time-overlapping (parallel) sessions. */
export function detectPresenterParallelSessions(
	sessions: ConflictSession[],
): ScheduleIssue[] {
	const byPresenter = new Map<
		string,
		{ session: ConflictSession; presenter: ConflictAuthor }[]
	>();
	for (const s of sessions) {
		const seen = new Set<string>();
		for (const p of s.presentations) {
			const presenter = p.submission.authors.find((a) => a.isPresenter);
			if (!presenter) continue;
			const k = authorKey(presenter);
			if (seen.has(k)) continue;
			seen.add(k);
			const arr = byPresenter.get(k);
			if (arr) arr.push({ session: s, presenter });
			else byPresenter.set(k, [{ session: s, presenter }]);
		}
	}

	const issues: ScheduleIssue[] = [];
	for (const entries of byPresenter.values()) {
		for (let i = 0; i < entries.length; i++) {
			for (let j = i + 1; j < entries.length; j++) {
				if (!overlaps(entries[i].session, entries[j].session)) continue;
				issues.push({
					kind: "PRESENTER_PARALLEL_SESSION",
					message: `${personName(entries[i].presenter)} is presenting in parallel sessions "${entries[i].session.title}" and "${entries[j].session.title}"`,
					sessionIds: [entries[i].session.id, entries[j].session.id],
				});
			}
		}
	}
	return issues;
}
