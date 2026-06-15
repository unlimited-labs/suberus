import { describe, expect, it } from "vitest";
import type {
	PublicProgramBreak,
	PublicProgramSession,
} from "@/features/planner/server/schedule";
import { buildTimeGroups } from "./program-formatting";
import type { ProgramItem } from "./program-types";

function session(
	id: string,
	startAt: string,
	endAt: string,
): { kind: "session"; data: PublicProgramSession } {
	return {
		kind: "session",
		data: {
			id,
			title: id,
			startAt: new Date(startAt),
			endAt: new Date(endAt),
			room: null,
			track: null,
			chairs: [],
			presentations: [],
		},
	};
}

function breakItem(
	id: string,
	startAt: string,
	endAt: string,
): { kind: "break"; data: PublicProgramBreak } {
	return {
		kind: "break",
		data: {
			id,
			title: id,
			startAt: new Date(startAt),
			endAt: new Date(endAt),
			room: null,
		},
	};
}

describe("buildTimeGroups", () => {
	it("returns an empty array for no items", () => {
		expect(buildTimeGroups([])).toEqual([]);
	});

	it("groups parallel items sharing a start time under one header", () => {
		const items: ProgramItem[] = [
			session("a", "2026-06-01T09:00:00Z", "2026-06-01T10:00:00Z"),
			session("b", "2026-06-01T09:00:00Z", "2026-06-01T09:30:00Z"),
			breakItem("c", "2026-06-01T09:00:00Z", "2026-06-01T09:15:00Z"),
		];
		const groups = buildTimeGroups(items);
		expect(groups).toHaveLength(1);
		expect(groups[0].sessions.map((s) => s.id)).toEqual(["a", "b"]);
		expect(groups[0].breaks.map((b) => b.id)).toEqual(["c"]);
	});

	it("extends a group's end to the latest item end", () => {
		const items: ProgramItem[] = [
			session("a", "2026-06-01T09:00:00Z", "2026-06-01T09:30:00Z"),
			session("b", "2026-06-01T09:00:00Z", "2026-06-01T10:00:00Z"),
		];
		const [group] = buildTimeGroups(items);
		expect(new Date(group.endAt).toISOString()).toBe(
			"2026-06-01T10:00:00.000Z",
		);
	});

	it("does not shrink a group's end for an earlier-ending item", () => {
		const items: ProgramItem[] = [
			session("a", "2026-06-01T09:00:00Z", "2026-06-01T10:00:00Z"),
			session("b", "2026-06-01T09:00:00Z", "2026-06-01T09:30:00Z"),
		];
		const [group] = buildTimeGroups(items);
		expect(new Date(group.endAt).toISOString()).toBe(
			"2026-06-01T10:00:00.000Z",
		);
	});

	it("starts a new group when the start time differs", () => {
		const items: ProgramItem[] = [
			session("a", "2026-06-01T09:00:00Z", "2026-06-01T10:00:00Z"),
			session("b", "2026-06-01T10:00:00Z", "2026-06-01T11:00:00Z"),
		];
		const groups = buildTimeGroups(items);
		expect(groups).toHaveLength(2);
		expect(groups[0].sessions.map((s) => s.id)).toEqual(["a"]);
		expect(groups[1].sessions.map((s) => s.id)).toEqual(["b"]);
	});
});
