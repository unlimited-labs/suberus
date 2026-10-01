import { afterEach, describe, expect, it, vi } from "vitest";
import {
	addCalendarDays,
	calendarDaysBetween,
	eachDayInZone,
	endOfDayInZone,
	formatClockTime,
	isoWeekday,
	startOfDayInZone,
	utcToWallClock,
	wallClockToUtc,
	withWallTime,
} from "./zoned";

afterEach(() => {
	vi.unstubAllEnvs();
});

const HOSTS = ["Asia/Tokyo", "Europe/London", "America/New_York"];

function onEveryHost(check: () => void) {
	for (const host of HOSTS) {
		vi.stubEnv("TZ", host);
		check();
	}
}

describe("host TZ stub", () => {
	it("actually changes the process zone", () => {
		vi.stubEnv("TZ", "Asia/Tokyo");
		const tokyo = new Date(Date.UTC(2026, 0, 1)).getHours();
		vi.stubEnv("TZ", "America/New_York");
		const newYork = new Date(Date.UTC(2026, 0, 1)).getHours();
		expect(tokyo).not.toBe(newYork);
	});
});

describe("wallClockToUtc across DST", () => {
	it("moves a skipped wall time forward, on any host", () => {
		onEveryHost(() => {
			expect(
				wallClockToUtc("2026-03-29T02:30", "Europe/Warsaw").toISOString(),
			).toBe("2026-03-29T01:30:00.000Z");
			expect(
				wallClockToUtc("2026-03-08T02:30", "America/New_York").toISOString(),
			).toBe("2026-03-08T07:30:00.000Z");
		});
	});

	it("takes the first occurrence of a repeated wall time, on any host", () => {
		onEveryHost(() => {
			expect(
				wallClockToUtc("2026-10-25T02:30", "Europe/Warsaw").toISOString(),
			).toBe("2026-10-25T00:30:00.000Z");
			expect(
				wallClockToUtc("2026-11-01T01:30", "America/New_York").toISOString(),
			).toBe("2026-11-01T05:30:00.000Z");
		});
	});

	it("returns Invalid Date for an empty or partial input", () => {
		expect(Number.isNaN(wallClockToUtc("", "Europe/Warsaw").getTime())).toBe(
			true,
		);
		expect(
			Number.isNaN(wallClockToUtc("2026-09-14T", "Europe/Warsaw").getTime()),
		).toBe(true);
	});

	it("round-trips through utcToWallClock", () => {
		onEveryHost(() => {
			const utc = wallClockToUtc("2026-09-14T09:05", "Europe/Warsaw");
			expect(utcToWallClock(utc, "Europe/Warsaw")).toBe("2026-09-14T09:05");
			expect(formatClockTime(utc, "Europe/Warsaw")).toBe("09:05");
		});
	});
});

describe("day boundaries", () => {
	it("starts a day at its first instant even when midnight is skipped", () => {
		expect(
			startOfDayInZone("2026-09-06", "America/Santiago").toISOString(),
		).toBe("2026-09-06T04:00:00.000Z");
	});

	it("ends a day at its last millisecond in the zone", () => {
		expect(endOfDayInZone("2026-04-15", "America/New_York").toISOString()).toBe(
			"2026-04-16T03:59:59.999Z",
		);
		expect(endOfDayInZone("2026-04-15", "").toISOString()).toBe(
			"2026-04-15T23:59:59.999Z",
		);
	});

	it("lists every calendar day, including a 23-hour DST day", () => {
		const days = eachDayInZone(
			startOfDayInZone("2026-03-28", "Europe/Warsaw"),
			startOfDayInZone("2026-03-30", "Europe/Warsaw"),
			"Europe/Warsaw",
		);
		expect(days.map((d) => d.toISOString())).toEqual([
			"2026-03-27T23:00:00.000Z",
			"2026-03-28T23:00:00.000Z",
			"2026-03-29T22:00:00.000Z",
		]);
	});
});

describe("calendar arithmetic", () => {
	it("counts calendar days, not 24-hour spans, across DST", () => {
		const beforeGap = new Date("2026-03-28T23:30:00Z");
		const afterGap = new Date("2026-03-29T22:30:00Z");
		expect(calendarDaysBetween(beforeGap, afterGap, "Europe/Warsaw")).toBe(1);
		expect(calendarDaysBetween(beforeGap, "2026-04-05", "Europe/Warsaw")).toBe(
			7,
		);
	});

	it("keeps the wall clock when adding days over DST", () => {
		const nineAm = wallClockToUtc("2026-03-28T09:00", "Europe/Warsaw");
		expect(
			utcToWallClock(
				addCalendarDays(nineAm, 2, "Europe/Warsaw"),
				"Europe/Warsaw",
			),
		).toBe("2026-03-30T09:00");
	});

	it("sets a wall time on the zoned day", () => {
		const lateEveningUtc = new Date("2026-09-13T23:30:00Z");
		expect(
			withWallTime(lateEveningUtc, "09:00", "Europe/Warsaw").toISOString(),
		).toBe("2026-09-14T07:00:00.000Z");
	});

	it("numbers weekdays Monday=1 … Sunday=7 in the zone", () => {
		const lateSundayUtc = new Date("2026-09-13T23:30:00Z");
		expect(isoWeekday(lateSundayUtc, "Asia/Tokyo")).toBe(1);
		expect(isoWeekday(lateSundayUtc, "America/New_York")).toBe(7);
	});
});
