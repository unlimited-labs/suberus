import * as XLSX from "xlsx";
import type { XlsxCell } from "@/shared/lib/xlsx-types";

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
