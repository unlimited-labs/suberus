import { describe, expect, it } from "vitest";
import { assignSessionCodes, roomLetter } from "./session-code-rules";

const at = (hhmm: string) => new Date(`2026-09-14T${hhmm}:00Z`);
const rank = new Map([
	["room-a", 0],
	["room-b", 1],
]);

describe("assignSessionCodes", () => {
	it("codes a session as day number, room letter and nth session in that room that day", () => {
		const codes = assignSessionCodes(
			[
				{ id: "s1", dayIndex: 2, roomId: "room-b", startAt: at("09:00") },
				{ id: "s2", dayIndex: 2, roomId: "room-b", startAt: at("11:00") },
				{ id: "s3", dayIndex: 2, roomId: "room-a", startAt: at("11:00") },
			],
			rank,
		);
		expect(codes.get("s1")).toBe("2B1");
		expect(codes.get("s2")).toBe("2B2");
		expect(codes.get("s3")).toBe("2A1");
	});

	it("uses X for sessions without a room", () => {
		const codes = assignSessionCodes(
			[{ id: "s1", dayIndex: 1, roomId: null, startAt: at("09:00") }],
			rank,
		);
		expect(codes.get("s1")).toBe("1X1");
	});
});

describe("roomLetter", () => {
	it("skips X, which is reserved for roomless sessions, and continues with AA after Z", () => {
		expect([22, 23, 24, 25, 26].map(roomLetter)).toEqual([
			"W",
			"Y",
			"Z",
			"AA",
			"AB",
		]);
	});
});
