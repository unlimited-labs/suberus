import { describe, expect, it } from "vitest";
import { analyzeSheetEmails, detectEmailColumn } from "./sheet-analysis";

const columns = ["Name", "Mail", "Hotel"];

describe("analyzeSheetEmails", () => {
	it("normalises emails and reports malformed ones", () => {
		const result = analyzeSheetEmails(
			{
				columns,
				rows: [
					["Ann", "  ANN@x.com ", "Willa"],
					["Bob", "not-an-email", "Willa"],
				],
			},
			1,
		);
		expect(result.emails).toEqual([{ row: 0, email: "ann@x.com" }]);
		expect(result.problems).toEqual([
			{ kind: "invalidEmail", row: 1, value: "not-an-email" },
		]);
	});

	it("reports a duplicate regardless of case", () => {
		const result = analyzeSheetEmails(
			{
				columns,
				rows: [
					["Ann", "ann@x.com", "A"],
					["Ann again", "ANN@X.COM", "B"],
				],
			},
			1,
		);
		expect(result.problems).toEqual([
			{ kind: "duplicateEmail", email: "ann@x.com", rows: [0, 1] },
		]);
	});

	it("lists empty cells per column, ignoring the email column", () => {
		const result = analyzeSheetEmails(
			{
				columns,
				rows: [
					["Ann", "ann@x.com", ""],
					["", "bob@x.com", "Willa"],
					["Cid", "cid@x.com", "  "],
				],
			},
			1,
		);
		expect(result.emptyCells).toEqual([
			{ column: 0, rows: [1] },
			{ column: 2, rows: [0, 2] },
		]);
	});
});

describe("detectEmailColumn", () => {
	it("picks the column holding the most addresses", () => {
		expect(
			detectEmailColumn({
				columns,
				rows: [
					["Ann", "ann@x.com", "Willa"],
					["Bob", "bob@x.com", "Hotel"],
				],
			}),
		).toBe(1);
	});

	it("falls back to the first column when nothing looks like an address", () => {
		expect(detectEmailColumn({ columns, rows: [["a", "b", "c"]] })).toBe(0);
	});
});
