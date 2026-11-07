import { describe, expect, it } from "vitest";
import { printFileName, printOptionsSchema } from "./print-options-schema";

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

describe("printFileName", () => {
	it("names the file after the conference, ASCII-only, marking drafts", () => {
		expect(printFileName("docx", true, "Polymers & Łódź 2026!")).toBe(
			"polymers-lodz-2026-program-DRAFT.docx",
		);
		expect(printFileName("xlsx", false, "")).toBe("program.xlsx");
	});
});
