import { afterEach, describe, expect, it, vi } from "vitest";
import { computeDefaultStartAt } from "./compute-default-start-at";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("computeDefaultStartAt", () => {
	const confStart = new Date("2026-09-12T22:00:00Z");

	it("puts the day start on the conference wall clock, not the planner's", () => {
		vi.stubEnv("TZ", "Asia/Tokyo");
		expect(
			computeDefaultStartAt(null, [], confStart, "09:00", "Europe/Warsaw"),
		).toEqual(new Date("2026-09-13T07:00:00Z"));
	});

	it("excludes a session starting exactly at the next conference midnight", () => {
		vi.stubEnv("TZ", "Asia/Tokyo");
		const sessions = [
			{ startAt: "2026-09-13T22:00:00Z", endAt: "2026-09-13T23:30:00Z" },
		];
		expect(
			computeDefaultStartAt(
				null,
				sessions,
				confStart,
				"09:00",
				"Europe/Warsaw",
			),
		).toEqual(new Date("2026-09-13T07:00:00Z"));
	});

	it("continues after the last session of that conference day", () => {
		vi.stubEnv("TZ", "Asia/Tokyo");
		const sessions = [
			{ startAt: "2026-09-13T07:00:00Z", endAt: "2026-09-13T09:30:00Z" },
			{ startAt: "2026-09-14T07:00:00Z", endAt: "2026-09-14T09:30:00Z" },
		];
		expect(
			computeDefaultStartAt(
				null,
				sessions,
				confStart,
				"09:00",
				"Europe/Warsaw",
			),
		).toEqual(new Date("2026-09-13T09:30:00Z"));
	});
});
