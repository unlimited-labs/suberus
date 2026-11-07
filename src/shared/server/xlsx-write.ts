import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import type { XlsxCell, XlsxSheetSpec } from "@/shared/lib/xlsx-types";

export function writeXlsxBuffer(
	rows: Array<Record<string, XlsxCell>>,
	sheetName: string,
): Buffer {
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
	return XLSX.write(wb, {
		type: "buffer",
		bookType: "xlsx",
		compression: true,
	});
}

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

function styleCell(cell: ExcelJS.Cell, wrap: boolean, header: boolean) {
	if (cell.value instanceof Date) cell.numFmt = "yyyy-mm-dd";
	if (wrap) cell.alignment = { wrapText: true, vertical: "top" };
	if (!header) return;
	cell.font = { bold: true };
	cell.fill = HEADER_FILL;
	cell.border = HEADER_RULE;
}

function styleRows(ws: ExcelJS.Worksheet, spec: XlsxSheetSpec, width: number) {
	const headerRows = spec.headerRows ?? 0;
	const wrap = spec.wrap === true;
	ws.eachRow((row, r) => {
		for (let c = 1; c <= width; c++)
			styleCell(row.getCell(c), wrap, r <= headerRows);
	});
}

function addSheet(wb: ExcelJS.Workbook, spec: XlsxSheetSpec) {
	const width = Math.max(0, ...spec.rows.map((r) => r.length));
	const ws = wb.addWorksheet(spec.name, { views: frozenView(spec) });
	ws.addRows(spec.rows);
	for (const [i, w] of (spec.widths ?? []).entries())
		ws.getColumn(i + 1).width = w;
	for (const m of spec.merges ?? [])
		ws.mergeCells(m.s.r + 1, m.s.c + 1, m.e.r + 1, m.e.c + 1);
	styleRows(ws, spec, width);
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
	title?: string,
): Promise<Buffer> {
	const wb = new ExcelJS.Workbook();
	if (title) wb.title = title;
	for (const spec of sheets) addSheet(wb, spec);
	return Buffer.from(await wb.xlsx.writeBuffer());
}
