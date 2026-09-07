import { describe, expect, it } from "vitest";
import { sheetAnnouncementCreateInput } from "./validations";

const base = {
	sheet: {
		columns: ["Name", "Mail", "Hotel"],
		rows: [["Ann", "ann@x.com", "Willa"]],
		headerRow: 0,
	},
	emailColumn: 1,
	mapping: [{ column: 2, target: { kind: "data", key: "hotel" } }],
};

describe("sheetAnnouncementCreateInput", () => {
	it("accepts a mapping without an unmatched choice", () => {
		expect(sheetAnnouncementCreateInput.safeParse(base).success).toBe(true);
	});

	it("ignores an unmatched choice rather than importing strangers", () => {
		const parsed = sheetAnnouncementCreateInput.safeParse({
			...base,
			unmatched: "add",
		});
		expect(parsed.success).toBe(true);
		expect(parsed.data).not.toHaveProperty("unmatched");
	});

	it("still rejects mapping the email column as a placeholder", () => {
		const parsed = sheetAnnouncementCreateInput.safeParse({
			...base,
			mapping: [{ column: 1, target: { kind: "data", key: "mail" } }],
		});
		expect(parsed.success).toBe(false);
	});
});
