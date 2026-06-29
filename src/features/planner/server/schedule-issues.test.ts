import { describe, expect, it } from "vitest";
import {
	detectChairOverlap,
	detectRoomDoubleBooking,
	findPairwiseOverlapIssues,
	type OverlapSession,
	overlaps,
} from "./schedule-issues";

const chair = (userId: string, name = userId) => ({
	userId,
	user: { firstName: name, lastName: "X", email: `${userId}@e.com` },
});

const presentation = (authors: { userId: string | null; email: string }[]) => ({
	submission: {
		authors: authors.map((a) => ({
			userId: a.userId,
			firstName: "A",
			lastName: "U",
			email: a.email,
		})),
	},
});

const session = (over: Partial<OverlapSession> = {}): OverlapSession => ({
	id: "s1",
	title: "S1",
	roomId: null,
	startAt: new Date("2026-01-01T10:00:00Z"),
	endAt: new Date("2026-01-01T11:00:00Z"),
	chairs: [],
	presentations: [],
	...over,
});

describe("overlaps", () => {
	it("is true for intersecting intervals, false otherwise", () => {
		const a = session();
		const later = {
			startAt: new Date("2026-01-01T10:30:00Z"),
			endAt: new Date("2026-01-01T11:30:00Z"),
		};
		const disjoint = {
			startAt: new Date("2026-01-01T11:00:00Z"),
			endAt: new Date("2026-01-01T12:00:00Z"),
		};
		expect(overlaps(a, later)).toBe(true);
		expect(overlaps(a, disjoint)).toBe(false); // half-open: touching ≠ overlap
	});
});

describe("detectRoomDoubleBooking", () => {
	it("flags two sessions in the same room", () => {
		const a = session({ id: "a", roomId: "r1" });
		const b = session({ id: "b", roomId: "r1" });
		expect(detectRoomDoubleBooking(a, b)?.kind).toBe("ROOM_DOUBLE_BOOKED");
	});

	it("returns null for different or absent rooms", () => {
		expect(
			detectRoomDoubleBooking(
				session({ roomId: "r1" }),
				session({ roomId: "r2" }),
			),
		).toBeNull();
		expect(
			detectRoomDoubleBooking(
				session({ roomId: null }),
				session({ roomId: null }),
			),
		).toBeNull();
	});
});

describe("detectChairOverlap", () => {
	it("flags a shared chair and dedupes", () => {
		const a = session({ id: "a" });
		const b = session({ id: "b", chairs: [chair("u1"), chair("u1")] });
		const issue = detectChairOverlap(a, b, new Set(["u1"]));
		expect(issue?.kind).toBe("CHAIR_OVERLAP");
		expect(issue?.sessionIds).toEqual(["a", "b"]);
	});

	it("returns null when no chair is shared", () => {
		expect(
			detectChairOverlap(
				session(),
				session({ chairs: [chair("u2")] }),
				new Set(["u1"]),
			),
		).toBeNull();
	});
});

describe("findPairwiseOverlapIssues", () => {
	it("reports chair, room and author conflicts for an overlapping pair", () => {
		const a = session({
			id: "a",
			roomId: "r1",
			chairs: [chair("c1")],
			presentations: [presentation([{ userId: "au1", email: "au1@e.com" }])],
		});
		const b = session({
			id: "b",
			roomId: "r1",
			startAt: new Date("2026-01-01T10:30:00Z"),
			endAt: new Date("2026-01-01T11:30:00Z"),
			chairs: [chair("c1")],
			presentations: [presentation([{ userId: "au1", email: "au1@e.com" }])],
		});
		const kinds = findPairwiseOverlapIssues([a, b]).map((i) => i.kind);
		expect(kinds).toEqual([
			"CHAIR_OVERLAP",
			"ROOM_DOUBLE_BOOKED",
			"AUTHOR_OVERLAP",
		]);
	});

	it("matches authors by email when userId is null", () => {
		const common = { userId: null, email: "shared@e.com" };
		const a = session({ id: "a", presentations: [presentation([common])] });
		const b = session({
			id: "b",
			startAt: new Date("2026-01-01T10:30:00Z"),
			endAt: new Date("2026-01-01T11:30:00Z"),
			presentations: [presentation([common])],
		});
		expect(findPairwiseOverlapIssues([a, b]).map((i) => i.kind)).toEqual([
			"AUTHOR_OVERLAP",
		]);
	});

	it("reports nothing for non-overlapping sessions", () => {
		const a = session({ id: "a", roomId: "r1", chairs: [chair("c1")] });
		const b = session({
			id: "b",
			roomId: "r1",
			chairs: [chair("c1")],
			startAt: new Date("2026-01-01T11:00:00Z"),
			endAt: new Date("2026-01-01T12:00:00Z"),
		});
		expect(findPairwiseOverlapIssues([a, b])).toEqual([]);
	});
});
