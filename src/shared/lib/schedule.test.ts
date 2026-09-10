import { describe, expect, it } from "vitest";
import { isFutureInstant, localInputToIso, scheduledAtInput } from "./schedule";

const NOW = new Date("2026-09-09T18:00:00.000Z");

describe("isFutureInstant", () => {
	it("accepts a later instant", () => {
		expect(isFutureInstant("2026-09-09T18:00:01.000Z", NOW)).toBe(true);
	});

	it("rejects the present and the past", () => {
		expect(isFutureInstant("2026-09-09T18:00:00.000Z", NOW)).toBe(false);
		expect(isFutureInstant("2026-09-09T17:59:59.000Z", NOW)).toBe(false);
	});

	it("rejects an unparseable value", () => {
		expect(isFutureInstant("not a date", NOW)).toBe(false);
	});
});

describe("scheduledAtInput", () => {
	it("allows omission", () => {
		expect(scheduledAtInput.parse(undefined)).toBeUndefined();
	});

	it("rejects a past instant", () => {
		expect(scheduledAtInput.safeParse("2020-01-01T00:00:00.000Z").success).toBe(
			false,
		);
	});
});

describe("localInputToIso", () => {
	it("resolves wall-clock through the ambient zone", () => {
		const iso = localInputToIso("2027-03-01T08:30");
		expect(iso).not.toBeNull();
		expect(new Date(iso ?? "").getHours()).toBe(8);
	});

	it("returns null for an empty or invalid input", () => {
		expect(localInputToIso("")).toBeNull();
		expect(localInputToIso("garbage")).toBeNull();
	});
});
