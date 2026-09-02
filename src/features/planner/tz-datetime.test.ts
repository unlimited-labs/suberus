import { afterEach, describe, expect, it, vi } from "vitest";
import { eachDayInTz, sameDayInTz, tzLocalInputToUtc } from "./tz-datetime";

afterEach(() => {
	vi.unstubAllEnvs();
});

function conferenceDays(start: string, end: string, zone: string) {
	return eachDayInTz(
		tzLocalInputToUtc(`${start}T00:00`, zone),
		tzLocalInputToUtc(`${end}T00:00`, zone),
		zone,
	);
}

describe("eachDayInTz", () => {
	it("keeps every conference day for a venue west of UTC", () => {
		vi.stubEnv("TZ", "Asia/Tokyo");
		const days = conferenceDays("2026-09-13", "2026-09-16", "America/New_York");
		expect(days).toHaveLength(4);
		const firstTalk = new Date("2026-09-13T09:00:00-04:00");
		const lastTalk = new Date("2026-09-16T09:00:00-04:00");
		expect(sameDayInTz(firstTalk, days[0], "America/New_York")).toBe(true);
		expect(sameDayInTz(lastTalk, days[3], "America/New_York")).toBe(true);
	});

	it("anchors days in the conference zone, not the viewer's", () => {
		vi.stubEnv("TZ", "Asia/Tokyo");
		const days = conferenceDays("2026-09-13", "2026-09-16", "Europe/Warsaw");
		expect(days).toHaveLength(4);
		const firstTalk = new Date("2026-09-13T09:00:00+02:00");
		expect(sameDayInTz(firstTalk, days[0], "Europe/Warsaw")).toBe(true);
	});
});
