import { afterEach, describe, expect, it, vi } from "vitest";
import {
	computeConferenceRange,
	isOutsideConferenceRange,
} from "./compute-conference-range";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("computeConferenceRange", () => {
	it("anchors the bounds at midnight in the conference zone", () => {
		vi.stubEnv("TZ", "Asia/Tokyo");
		const r = computeConferenceRange({
			conferenceStartDate: "2026-04-22",
			conferenceEndDate: "2026-04-24",
			timezone: "Europe/Warsaw",
		});
		expect(r.confStart).toEqual(new Date("2026-04-21T22:00:00Z"));
		expect(r.confEnd).toEqual(new Date("2026-04-23T22:00:00Z"));
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
	const zone = "Europe/Warsaw";
	const start = new Date("2026-04-21T22:00:00Z");
	const end = new Date("2026-04-23T22:00:00Z");

	it("is false inside the range", () => {
		expect(
			isOutsideConferenceRange(
				new Date("2026-04-22T22:00:00Z"),
				start,
				end,
				zone,
			),
		).toBe(false);
	});

	it("includes the whole first and last day", () => {
		expect(isOutsideConferenceRange(start, start, end, zone)).toBe(false);
		expect(
			isOutsideConferenceRange(
				new Date("2026-04-24T15:00:00Z"),
				start,
				end,
				zone,
			),
		).toBe(false);
	});

	it("is true before start and after end", () => {
		expect(
			isOutsideConferenceRange(
				new Date("2026-04-20T12:00:00Z"),
				start,
				end,
				zone,
			),
		).toBe(true);
		expect(
			isOutsideConferenceRange(
				new Date("2026-04-26T12:00:00Z"),
				start,
				end,
				zone,
			),
		).toBe(true);
	});

	it("is false when any bound is null", () => {
		expect(isOutsideConferenceRange(null, start, end, zone)).toBe(false);
		expect(
			isOutsideConferenceRange(new Date("2026-04-20"), null, end, zone),
		).toBe(false);
		expect(
			isOutsideConferenceRange(new Date("2026-04-20"), start, null, zone),
		).toBe(false);
	});
});
