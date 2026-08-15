import { describe, expect, it } from "vitest";
import { tzLocalInputToUtc } from "../tz-datetime";
import { assertOrderedTimes, nextDay, overlapWhere } from "./time-range";

describe("nextDay", () => {
	it("crosses month and year ends", () => {
		expect(nextDay("2026-02-28")).toBe("2026-03-01");
		expect(nextDay("2026-12-31")).toBe("2027-01-01");
	});

	it("gives a day window that respects the conference timezone", () => {
		const zone = "Europe/Warsaw";
		const from = tzLocalInputToUtc("2026-09-14T00:00", zone);
		const to = tzLocalInputToUtc(`${nextDay("2026-09-14")}T00:00`, zone);
		expect(from.toISOString()).toBe("2026-09-13T22:00:00.000Z");
		expect(to.toISOString()).toBe("2026-09-14T22:00:00.000Z");
	});
});

describe("assertOrderedTimes", () => {
	const start = new Date("2026-09-14T09:00:00Z");

	it("rejects an end at or before the start", () => {
		expect(() => assertOrderedTimes(start, start)).toThrow();
		expect(() =>
			assertOrderedTimes(start, new Date("2026-09-14T08:00:00Z")),
		).toThrow();
	});

	it("passes a proper range or a half-open update", () => {
		expect(() =>
			assertOrderedTimes(start, new Date("2026-09-14T10:00:00Z")),
		).not.toThrow();
		expect(() => assertOrderedTimes(start, undefined)).not.toThrow();
	});
});

describe("overlapWhere", () => {
	it("keeps items straddling the boundary", () => {
		const from = new Date("2026-09-14T00:00:00Z");
		const to = new Date("2026-09-15T00:00:00Z");
		expect(overlapWhere({ from, to })).toEqual({
			startAt: { lt: to },
			endAt: { gt: from },
		});
	});

	it("leaves an open end unconstrained", () => {
		const from = new Date("2026-09-14T00:00:00Z");
		expect(overlapWhere({ from })).toEqual({
			startAt: undefined,
			endAt: { gt: from },
		});
	});
});
