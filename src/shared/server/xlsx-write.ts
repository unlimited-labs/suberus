import * as XLSX from "xlsx";

/** Typed string cells (`t="str"`, no `<f>`): Excel never evaluates these, so
 * neutralizeFormula belongs to the CSV path — here it would ship as data. */
export type XlsxCell = string | number | boolean | Date | null;

export function writeXlsxBuffer(
	rows: Array<Record<string, XlsxCell>>,
	sheetName: string,
): Buffer {
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
	return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
