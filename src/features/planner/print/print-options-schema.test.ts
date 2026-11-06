import { describe, expect, it } from "vitest";
import { printOptionsSchema } from "./print-options-schema";

describe("printOptionsSchema", () => {
	it("fills the documented defaults when nothing has been saved yet", () => {
		expect(printOptionsSchema.parse({})).toEqual({
			bookSize: "A4",
			trackColor: true,
			layoutOverride: "auto",
			includeCancelled: false,
			language: "en",
			parts: ["title", "glance", "detailed", "index"],
			showLogo: true,
		});
	});

	it("rejects a selection with neither Program at a glance nor Detailed program", () => {
		expect(
			printOptionsSchema.safeParse({ parts: ["title", "index"] }).success,
		).toBe(false);
	});
});
