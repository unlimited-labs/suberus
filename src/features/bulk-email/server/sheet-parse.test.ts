import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseSheetBuffer } from "./sheet-parse";

function workbook(rows: unknown[][]): Buffer {
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Sheet1");
	return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("parseSheetBuffer", () => {
	it("finds the header below a title row and keeps dates as text", () => {
		const sheet = parseSheetBuffer(
			workbook([
				["PJMICRO 2026 — Uczestnicy"],
				[],
				[],
				["Imię", "Mail", "Dni pobytu"],
				["Robert", "robert@us.edu.pl", "13.09.2026 - 16.09.2026"],
			]),
		);
		expect(sheet.columns).toEqual(["Imię", "Mail", "Dni pobytu"]);
		expect(sheet.rows).toEqual([
			["Robert", "robert@us.edu.pl", "13.09.2026 - 16.09.2026"],
		]);
	});

	it("pads short rows, keeps interior blanks and strips the formula guard", () => {
		const sheet = parseSheetBuffer(
			workbook([
				["Name", "Mail", "Hotel"],
				["Ann", "ann@x.com"],
				[],
				["'=cmd", "bob@x.com", "Willa"],
			]),
		);
		expect(sheet.rows).toEqual([
			["Ann", "ann@x.com", ""],
			["", "", ""],
			["=cmd", "bob@x.com", "Willa"],
		]);
	});

	it("keeps an apostrophe that belongs to the name", () => {
		const sheet = parseSheetBuffer(
			workbook([
				["Name", "Mail"],
				["'t Hooft", "gerard@x.com"],
			]),
		);
		expect(sheet.rows[0]?.[0]).toBe("'t Hooft");
	});

	it("rejects a file that is not a workbook", () => {
		expect(() => parseSheetBuffer(Buffer.from("not a spreadsheet"))).toThrow();
	});

	it("reads a single-column file, where no row has two filled cells", () => {
		const sheet = parseSheetBuffer(
			workbook([["Mail"], ["ann@x.com"], ["bob@x.com"]]),
		);
		expect(sheet.columns).toEqual(["Mail"]);
		expect(sheet.rows).toEqual([["ann@x.com"], ["bob@x.com"]]);
	});

	it("keeps interior blanks so a row still counts to its line in the file", () => {
		const sheet = parseSheetBuffer(
			workbook([
				["Participants"],
				[],
				["Name", "Mail"],
				["Ann", "ann@x.com"],
				[],
				["Bob", "bob@x.com"],
				[],
			]),
		);
		expect(sheet.headerRow).toBe(2);
		expect(sheet.rows).toEqual([
			["Ann", "ann@x.com"],
			["", ""],
			["Bob", "bob@x.com"],
		]);
	});

	it("names empty headers and disambiguates duplicates", () => {
		const sheet = parseSheetBuffer(
			workbook([
				["Mail", "", "Hotel", "Hotel"],
				["a@x.com", "x", "H1", "H2"],
			]),
		);
		expect(sheet.columns).toEqual(["Mail", "Column 2", "Hotel", "Hotel (2)"]);
	});

	it("rejects a file with a header but no rows", () => {
		expect(() => parseSheetBuffer(workbook([["Mail", "Hotel"]]))).toThrow();
	});
});
