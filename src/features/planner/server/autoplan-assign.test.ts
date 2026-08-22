import { describe, expect, it } from "vitest";
import {
	type AssignSession,
	assignClustersToSessions,
} from "./autoplan-assign";
import { overlaps } from "./schedule-issues";

const sess = (startISO: string, endISO: string): AssignSession => ({
	startAt: new Date(startISO),
	endAt: new Date(endISO),
});

function parallelConflicts(
	assign: number[],
	keys: Set<string>[],
	sessions: AssignSession[],
): number {
	let n = 0;
	for (let i = 0; i < assign.length; i++)
		for (let j = i + 1; j < assign.length; j++)
			if (
				[...keys[i]].some((k) => keys[j].has(k)) &&
				overlaps(sessions[assign[i]], sessions[assign[j]])
			)
				n++;
	return n;
}

describe("assignClustersToSessions", () => {
	it("keeps identity when nothing conflicts", () => {
		const sessions = [
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
		];
		expect(
			assignClustersToSessions([new Set(["a"]), new Set(["b"])], sessions),
		).toEqual([0, 1]);
	});

	it("swaps conflicting clusters out of parallel sessions when a feasible slot exists", () => {
		const sessions = [
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
			sess("2026-01-01T11:00Z", "2026-01-01T12:00Z"),
			sess("2026-01-01T11:00Z", "2026-01-01T12:00Z"),
		];
		const keys = [
			new Set(["x"]),
			new Set(["x"]),
			new Set(["y"]),
			new Set(["z"]),
		];
		expect(parallelConflicts([0, 1, 2, 3], keys, sessions)).toBe(1);
		const assign = assignClustersToSessions(keys, sessions);
		expect(parallelConflicts(assign, keys, sessions)).toBe(0);
		expect([...assign].sort()).toEqual([0, 1, 2, 3]);
	});

	it("is deterministic across runs (fixed seed)", () => {
		const sessions = [
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
			sess("2026-01-01T11:00Z", "2026-01-01T12:00Z"),
			sess("2026-01-01T11:00Z", "2026-01-01T12:00Z"),
		];
		const keys = [
			new Set(["x"]),
			new Set(["x"]),
			new Set(["x"]),
			new Set(["y"]),
		];
		const first = assignClustersToSessions(keys, sessions);
		expect(assignClustersToSessions(keys, sessions)).toEqual(first);
	});

	it("solves a 3-block mutual conflict via restarts", () => {
		const b0a = sess("2026-01-01T09:00Z", "2026-01-01T10:00Z");
		const b0b = sess("2026-01-01T09:00Z", "2026-01-01T10:00Z");
		const b1a = sess("2026-01-01T11:00Z", "2026-01-01T12:00Z");
		const b1b = sess("2026-01-01T11:00Z", "2026-01-01T12:00Z");
		const b2a = sess("2026-01-01T13:00Z", "2026-01-01T14:00Z");
		const b2b = sess("2026-01-01T13:00Z", "2026-01-01T14:00Z");
		const sessions = [b0a, b0b, b1a, b1b, b2a, b2b];
		const keys = [
			new Set(["x"]),
			new Set(["x"]),
			new Set(["x"]),
			new Set<string>(),
			new Set<string>(),
			new Set<string>(),
		];
		const assign = assignClustersToSessions(keys, sessions);
		expect(parallelConflicts(assign, keys, sessions)).toBe(0);
		expect([...assign].sort()).toEqual([0, 1, 2, 3, 4, 5]);
	});

	// The climb reorders its working array in place; that must not reach the
	// caller's clusters or sessions.
	it("leaves the caller's inputs untouched", () => {
		const sessions = [
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
			sess("2026-01-01T11:00Z", "2026-01-01T12:00Z"),
			sess("2026-01-01T11:00Z", "2026-01-01T12:00Z"),
		];
		const keys = [
			new Set(["x"]),
			new Set(["x"]),
			new Set(["y"]),
			new Set(["z"]),
		];
		const sessionsBefore = sessions.map((s) => [
			s.startAt.toISOString(),
			s.endAt.toISOString(),
		]);
		const keysBefore = keys.map((k) => [...k]);

		assignClustersToSessions(keys, sessions);

		expect(
			sessions.map((s) => [s.startAt.toISOString(), s.endAt.toISOString()]),
		).toEqual(sessionsBefore);
		expect(keys.map((k) => [...k])).toEqual(keysBefore);
	});

	it("returns a bijection and terminates when the conflict is infeasible", () => {
		const sessions = [
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
			sess("2026-01-01T09:00Z", "2026-01-01T10:00Z"),
		];
		const keys = [new Set(["x"]), new Set(["x"])];
		const assign = assignClustersToSessions(keys, sessions);
		expect([...assign].sort()).toEqual([0, 1]);
		expect(parallelConflicts(assign, keys, sessions)).toBe(1);
	});
});
