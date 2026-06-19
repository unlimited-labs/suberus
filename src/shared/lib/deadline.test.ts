import { describe, expect, it } from "vitest";
import { deadlineCutoff, isDeadlinePassed } from "./deadline";

// TZDate.toISOString() keeps its offset; normalize to a plain UTC instant.
const instant = (d: Date) => new Date(d.getTime()).toISOString();

describe("deadlineCutoff", () => {
	it("returns end of the deadline day in UTC when timezone is empty", () => {
		expect(instant(deadlineCutoff("2026-04-15", ""))).toBe(
			"2026-04-15T23:59:59.999Z",
		);
	});

	it("returns end of day in the conference timezone", () => {
		// America/New_York on 2026-04-15 is UTC-4 (DST) → 23:59:59.999 local = 03:59 UTC next day
		expect(instant(deadlineCutoff("2026-04-15", "America/New_York"))).toBe(
			"2026-04-16T03:59:59.999Z",
		);
	});

	it("tolerates a trailing time component", () => {
		expect(instant(deadlineCutoff("2026-04-15T00:00:00Z", ""))).toBe(
			"2026-04-15T23:59:59.999Z",
		);
	});
});

describe("isDeadlinePassed", () => {
	it("stays open all day on the deadline day (UTC)", () => {
		expect(
			isDeadlinePassed("2026-04-15", "", new Date("2026-04-15T23:59:00Z")),
		).toBe(false);
	});

	it("is closed at the start of the next day (UTC)", () => {
		expect(
			isDeadlinePassed("2026-04-15", "", new Date("2026-04-16T00:00:00Z")),
		).toBe(true);
	});

	it("respects the conference timezone past UTC midnight", () => {
		// 2026-04-16 02:00 UTC = 2026-04-15 22:00 in New York → still open
		expect(
			isDeadlinePassed(
				"2026-04-15",
				"America/New_York",
				new Date("2026-04-16T02:00:00Z"),
			),
		).toBe(false);
		// 2026-04-16 04:00 UTC = 2026-04-16 00:00 in New York → closed
		expect(
			isDeadlinePassed(
				"2026-04-15",
				"America/New_York",
				new Date("2026-04-16T04:00:00Z"),
			),
		).toBe(true);
	});
});
