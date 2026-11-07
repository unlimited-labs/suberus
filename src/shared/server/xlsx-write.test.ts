import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { writeXlsxBuffer, writeXlsxWorkbook } from "./xlsx-write";

describe("writeXlsxBuffer", () => {
	it("writes a formula-looking value as text, not a formula", () => {
		const buffer = writeXlsxBuffer([{ Title: "=cmd()" }], "S");
		const sheet = XLSX.read(buffer, { type: "buffer" }).Sheets.S;
		const cell = sheet?.A2;

		expect(cell?.t).toBe("s");
		expect(cell?.f).toBeUndefined();
		expect(cell?.v).toBe("=cmd()");
	});

	it("keeps a leading dash out of the exported value", () => {
		const buffer = writeXlsxBuffer([{ Title: "-omics profiling" }], "S");
		const sheet = XLSX.read(buffer, { type: "buffer" }).Sheets.S;

		expect(sheet?.A2?.v).toBe("-omics profiling");
	});
});

describe("writeXlsxWorkbook", () => {
	it("writes several sheets with merges, an autofilter and a calendar date that does not shift with the server zone", async () => {
		const buffer = await writeXlsxWorkbook(
			[
				{
					name: "A",
					rows: [["Date"], [new Date("2026-09-14T00:00:00Z")]],
					autofilter: true,
				},
				{
					name: "B",
					rows: [["x", null]],
					merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }],
				},
			],
			"T",
		);
		const wb = XLSX.read(buffer, { type: "buffer" });
		expect(wb.SheetNames).toEqual(["A", "B"]);
		expect(wb.Sheets.A?.A2?.w).toBe("2026-09-14");
		expect(wb.Sheets.A?.["!autofilter"]?.ref).toBe("A1:A2");
		expect(wb.Sheets.B?.["!merges"]).toEqual([
			{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
		]);
	});

	it("keeps a formula-looking title as text", async () => {
		const buffer = await writeXlsxWorkbook(
			[{ name: "S", rows: [["=cmd()"]] }],
			"T",
		);
		const cell = XLSX.read(buffer, { type: "buffer" }).Sheets.S?.A1;
		expect(cell?.f).toBeUndefined();
		expect(cell?.v).toBe("=cmd()");
	});

	it("styles and freezes the header and marks accented cells", async () => {
		const buffer = await writeXlsxWorkbook(
			[
				{
					name: "Grid",
					rows: [
						["Time", "Aula"],
						["09:00", "1A1"],
					],
					headerRows: 1,
					frozenColumns: 1,
					accents: [{ r: 1, c: 1, color: "#d9480f" }],
				},
			],
			"T",
		);
		const wb = new ExcelJS.Workbook();
		await wb.xlsx.load(new Uint8Array(buffer).buffer);
		const ws = wb.getWorksheet("Grid");
		expect(ws?.views[0]).toMatchObject({
			state: "frozen",
			xSplit: 1,
			ySplit: 1,
		});
		expect(ws?.getCell("A1").font?.bold).toBe(true);
		expect(ws?.getCell("B2").border?.left?.color?.argb).toBe("FFD9480F");
	});
});
