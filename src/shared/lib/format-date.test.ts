import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatDate, parseDateOnly } from "./format-date";

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
			formatDate(parseDateOnly("2026-03-10T00:00:00Z"), "DD.MM.YYYY"),
		).toBe("10.03.2026");
	});
});

describe("formatDate zone", () => {
	it("formats an instant in the given zone", () => {
		const nyEndOfDay = new Date("2026-10-16T03:59:59.999Z");
		expect(formatDate(nyEndOfDay, "YYYY-MM-DD", "America/New_York")).toBe(
			"2026-10-15",
		);
	});
});
