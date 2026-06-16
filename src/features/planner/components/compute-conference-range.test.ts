import { describe, expect, it } from "vitest";
import {
	computeConferenceRange,
	isOutsideConferenceRange,
} from "./compute-conference-range";

describe("computeConferenceRange", () => {
	it("parses present dates and timezone", () => {
		const r = computeConferenceRange({
			conferenceStartDate: "2026-04-22",
			conferenceEndDate: "2026-04-24",
			timezone: "Europe/Warsaw",
		});
		expect(r.confStart).toEqual(new Date("2026-04-22"));
		expect(r.confEnd).toEqual(new Date("2026-04-24"));
		expect(r.tz).toBe("Europe/Warsaw");
	});

	it("maps empty date strings to null", () => {
		const r = computeConferenceRange({
			conferenceStartDate: "",
			conferenceEndDate: "",
			timezone: "",
		});
		expect(r.confStart).toBeNull();
		expect(r.confEnd).toBeNull();
		expect(r.tz).toBeUndefined();
	});
});

describe("isOutsideConferenceRange", () => {
	const start = new Date("2026-04-22");
	const end = new Date("2026-04-24");

	it("is false inside the range", () => {
		expect(isOutsideConferenceRange(new Date("2026-04-23"), start, end)).toBe(
			false,
		);
	});

	it("is true before start and after end", () => {
		expect(isOutsideConferenceRange(new Date("2026-04-20"), start, end)).toBe(
			true,
		);
		expect(isOutsideConferenceRange(new Date("2026-04-26"), start, end)).toBe(
			true,
		);
	});

	it("is false when any bound is null", () => {
		expect(isOutsideConferenceRange(null, start, end)).toBe(false);
		expect(isOutsideConferenceRange(new Date("2026-04-20"), null, end)).toBe(
			false,
		);
		expect(isOutsideConferenceRange(new Date("2026-04-20"), start, null)).toBe(
			false,
		);
	});
});
