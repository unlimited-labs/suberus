import { describe, expect, it } from "vitest";
import {
	type ConflictSession,
	detectAuthorTimeClashes,
	detectPresenterParallelSessions,
} from "./author-conflicts";

type Author =
	ConflictSession["presentations"][number]["submission"]["authors"][number];

const au = (over: Partial<Author> = {}): Author => ({
	userId: null,
	firstName: "A",
	lastName: "U",
	email: "a@e.com",
	isPresenter: false,
	...over,
});

let counter = 0;
const talk = (order: number, durationMin: number, authors: Author[]) => ({
	order,
	durationMin,
	submission: { id: `sub-${counter++}`, title: `T${order}`, authors },
});

const sess = (
	id: string,
	startISO: string,
	endISO: string,
	presentations: ConflictSession["presentations"],
): ConflictSession => ({
	id,
	title: id,
	startAt: new Date(startISO),
	endAt: new Date(endISO),
	presentations,
});

describe("detectAuthorTimeClashes", () => {
	const x = { userId: "x", email: "x@e.com" };

	it("flags a shared author in near-adjacent talks (14 min < 15 buffer)", () => {
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au(x)]),
		]);
		const b = sess("b", "2026-01-01T10:29:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au(x)]),
		]);
		expect(detectAuthorTimeClashes([a, b], 15).map((i) => i.kind)).toEqual([
			"AUTHOR_TIME_CLASH",
		]);
	});

	it("does not flag talks exactly `buffer` minutes apart", () => {
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au(x)]),
		]);
		const b = sess("b", "2026-01-01T10:30:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au(x)]),
		]);
		expect(detectAuthorTimeClashes([a, b], 15)).toEqual([]);
	});

	it("flags overlapping talks even with buffer 0", () => {
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 30, [au(x)]),
		]);
		const b = sess("b", "2026-01-01T10:15:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 30, [au(x)]),
		]);
		expect(detectAuthorTimeClashes([a, b], 0).map((i) => i.kind)).toEqual([
			"AUTHOR_TIME_CLASH",
		]);
	});

	it("does not flag consecutive talks within the same session", () => {
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au(x)]),
			talk(1, 15, [au(x)]),
		]);
		expect(detectAuthorTimeClashes([a], 15)).toEqual([]);
	});

	it("counts shared co-authors, not only presenters", () => {
		const coauthor = { userId: "co", email: "co@e.com" };
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au({ userId: "p1", isPresenter: true }), au(coauthor)]),
		]);
		const b = sess("b", "2026-01-01T10:05:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au({ userId: "p2", isPresenter: true }), au(coauthor)]),
		]);
		expect(detectAuthorTimeClashes([a, b], 15).map((i) => i.kind)).toEqual([
			"AUTHOR_TIME_CLASH",
		]);
	});

	it("matches authors by email when userId is null", () => {
		const shared = { userId: null, email: "shared@e.com" };
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au(shared)]),
		]);
		const b = sess("b", "2026-01-01T10:05:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au(shared)]),
		]);
		expect(detectAuthorTimeClashes([a, b], 15).map((i) => i.kind)).toEqual([
			"AUTHOR_TIME_CLASH",
		]);
	});

	it("emits one issue per talk-pair even with multiple shared authors", () => {
		const s1 = { userId: "s1", email: "s1@e.com" };
		const s2 = { userId: "s2", email: "s2@e.com" };
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au(s1), au(s2)]),
		]);
		const b = sess("b", "2026-01-01T10:05:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 15, [au(s1), au(s2)]),
		]);
		expect(detectAuthorTimeClashes([a, b], 15)).toHaveLength(1);
	});
});

describe("detectPresenterParallelSessions", () => {
	it("flags a presenter presenting in two overlapping sessions", () => {
		const p = { userId: "p", email: "p@e.com", isPresenter: true };
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z", [
			talk(0, 30, [au(p)]),
		]);
		const b = sess("b", "2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z", [
			talk(0, 30, [au(p)]),
		]);
		expect(detectPresenterParallelSessions([a, b]).map((i) => i.kind)).toEqual([
			"PRESENTER_PARALLEL_SESSION",
		]);
	});

	it("does not flag a presenter in two non-overlapping sessions", () => {
		const p = { userId: "p", email: "p@e.com", isPresenter: true };
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z", [
			talk(0, 30, [au(p)]),
		]);
		const b = sess("b", "2026-01-01T11:00:00Z", "2026-01-01T12:00:00Z", [
			talk(0, 30, [au(p)]),
		]);
		expect(detectPresenterParallelSessions([a, b])).toEqual([]);
	});

	it("does not flag a non-presenting co-author across parallel sessions", () => {
		const co = { userId: "co", email: "co@e.com" };
		const a = sess("a", "2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z", [
			talk(0, 30, [au({ userId: "p1", isPresenter: true }), au(co)]),
		]);
		const b = sess("b", "2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z", [
			talk(0, 30, [au({ userId: "p2", isPresenter: true }), au(co)]),
		]);
		expect(detectPresenterParallelSessions([a, b])).toEqual([]);
	});
});
