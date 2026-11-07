import ExcelJS from "exceljs";
import type { XlsxSheetSpec } from "@/shared/lib/xlsx-types";

const argb = (hex: string) => `FF${hex.slice(1).toUpperCase()}`;
const HEADER_FILL: ExcelJS.Fill = {
	type: "pattern",
	pattern: "solid",
	fgColor: { argb: "FFF1F3F5" },
};
const HEADER_RULE: Partial<ExcelJS.Borders> = {
	bottom: { style: "thin", color: { argb: "FFADB5BD" } },
};

function frozenView(
	spec: XlsxSheetSpec,
): Array<Partial<ExcelJS.WorksheetView>> {
	const xSplit = spec.frozenColumns ?? 0;
	const ySplit = spec.headerRows ?? 0;
	return xSplit + ySplit > 0 ? [{ state: "frozen", xSplit, ySplit }] : [];
}

function styleSheet(ws: ExcelJS.Worksheet, spec: XlsxSheetSpec, width: number) {
	for (let r = 1; r <= (spec.headerRows ?? 0); r++)
		for (let c = 1; c <= width; c++) {
			const cell = ws.getCell(r, c);
			cell.font = { bold: true };
			cell.fill = HEADER_FILL;
			cell.border = HEADER_RULE;
		}
	if (spec.wrap)
		for (let c = 1; c <= width; c++)
			ws.getColumn(c).alignment = { wrapText: true, vertical: "top" };
	spec.rows.forEach((row, r) =>
		row.forEach((value, c) => {
			if (value instanceof Date) ws.getCell(r + 1, c + 1).numFmt = "yyyy-mm-dd";
		}),
	);
}

function addSheet(wb: ExcelJS.Workbook, spec: XlsxSheetSpec) {
	const width = Math.max(0, ...spec.rows.map((r) => r.length));
	const ws = wb.addWorksheet(spec.name, { views: frozenView(spec) });
	ws.addRows(spec.rows);
	for (const [i, w] of (spec.widths ?? []).entries())
		ws.getColumn(i + 1).width = w;
	for (const m of spec.merges ?? [])
		ws.mergeCells(m.s.r + 1, m.s.c + 1, m.e.r + 1, m.e.c + 1);
	styleSheet(ws, spec, width);
	for (const a of spec.accents ?? [])
		ws.getCell(a.r + 1, a.c + 1).border = {
			left: { style: "thick", color: { argb: argb(a.color) } },
		};
	if (spec.autofilter)
		ws.autoFilter = {
			from: { row: 1, column: 1 },
			to: { row: spec.rows.length, column: width },
		};
}

export async function writeXlsxWorkbook(
	sheets: readonly XlsxSheetSpec[],
	title: string,
): Promise<Buffer> {
	const wb = new ExcelJS.Workbook();
	wb.title = title;
	for (const spec of sheets) addSheet(wb, spec);
	return Buffer.from(await wb.xlsx.writeBuffer());
}
