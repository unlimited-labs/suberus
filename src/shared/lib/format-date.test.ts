import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dateForPattern, formatDate } from "./format-date";

describe("date-only settings west of UTC", () => {
	let originalTz: string | undefined;
	beforeEach(() => {
		originalTz = process.env.TZ;
		process.env.TZ = "America/New_York";
	});
	afterEach(() => {
		process.env.TZ = originalTz;
	});

	it("keeps the stored calendar day", () => {
		expect(formatDate("2026-03-10", "DD.MM.YYYY")).toBe("10.03.2026");
		expect(
			formatDate(dateForPattern("2026-03-10T00:00:00Z"), "DD.MM.YYYY"),
		).toBe("10.03.2026");
	});

	it("keeps a day whose local midnight is skipped by DST", () => {
		process.env.TZ = "America/Santiago";
		expect(formatDate(dateForPattern("2026-09-06"), "DD.MM.YYYY")).toBe(
			"06.09.2026",
		);
	});
});
