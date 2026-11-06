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

export function writeXlsxWorkbook(
	sheets: readonly XlsxSheetSpec[],
	title?: string,
): Buffer {
	const wb = XLSX.utils.book_new();
	if (title) wb.Props = { Title: title };
	for (const spec of sheets) {
		const ws = XLSX.utils.aoa_to_sheet(spec.rows, { UTC: true });
		if (spec.merges?.length) ws["!merges"] = spec.merges;
		if (spec.widths) ws["!cols"] = spec.widths.map((wch) => ({ wch }));
		const ref = ws["!ref"];
		if (spec.autofilter && ref) ws["!autofilter"] = { ref };
		XLSX.utils.book_append_sheet(wb, ws, spec.name);
	}
	return XLSX.write(wb, {
		type: "buffer",
		bookType: "xlsx",
		compression: true,
	});
}
