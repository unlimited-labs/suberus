import { afterEach, describe, expect, it, vi } from "vitest";
import { computeHiddenWeekdays } from "./compute-hidden-weekdays";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("computeHiddenWeekdays", () => {
	it("returns empty when either bound is null", () => {
		expect(computeHiddenWeekdays(null, null, "UTC")).toEqual([]);
		expect(
			computeHiddenWeekdays(new Date("2026-04-22T00:00:00Z"), null, "UTC"),
		).toEqual([]);
		expect(
			computeHiddenWeekdays(null, new Date("2026-04-24T00:00:00Z"), "UTC"),
		).toEqual([]);
	});

	it("hides weekdays outside a Wed–Fri conference", () => {
		const hidden = computeHiddenWeekdays(
			new Date("2026-04-22T00:00:00Z"),
			new Date("2026-04-24T23:00:00Z"),
			"UTC",
		);
		expect(hidden.sort()).toEqual(
			["monday", "saturday", "sunday", "tuesday"].sort(),
		);
	});

	it("handles Sun–Wed range (crossing Sunday)", () => {
		const hidden = computeHiddenWeekdays(
			new Date("2026-04-19T00:00:00Z"),
			new Date("2026-04-22T23:00:00Z"),
			"UTC",
		);
		expect(hidden.sort()).toEqual(["friday", "saturday", "thursday"].sort());
	});

	it("returns empty for a conference spanning a full week or longer", () => {
		expect(
			computeHiddenWeekdays(
				new Date("2026-04-20T00:00:00Z"),
				new Date("2026-04-26T23:00:00Z"),
				"UTC",
			),
		).toEqual([]);
		expect(
			computeHiddenWeekdays(
				new Date("2026-04-21T00:00:00Z"),
				new Date("2026-05-21T23:00:00Z"),
				"UTC",
			),
		).toEqual([]);
	});

	it("keeps end-of-day from spilling into the next weekday", () => {
		const hidden = computeHiddenWeekdays(
			new Date("2026-04-22T00:00:00Z"),
			new Date("2026-04-24T23:00:00Z"),
			"UTC",
		);
		expect(hidden).toContain("saturday");
	});

	it("reads weekdays in the conference zone, not the runtime zone", () => {
		vi.stubEnv("TZ", "Asia/Tokyo");
		const hidden = computeHiddenWeekdays(
			new Date("2026-09-12T22:00:00Z"),
			new Date("2026-09-15T22:00:00Z"),
			"Europe/Warsaw",
		);
		expect(hidden.sort()).toEqual(["thursday", "friday", "saturday"].sort());
	});

	it("returns empty when end is before start", () => {
		expect(
			computeHiddenWeekdays(
				new Date("2026-04-24T00:00:00Z"),
				new Date("2026-04-22T00:00:00Z"),
				"UTC",
			),
		).toEqual([]);
	});
});
