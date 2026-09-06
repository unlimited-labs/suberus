import * as XLSX from "xlsx";
import { MAX_SHEET_ROWS, type Sheet } from "../validations";

type SheetCell = string | number | boolean | null | undefined;

function cell(value: SheetCell): string {
	// Undo the leading-quote guard from spreadsheet-safe.ts, which only ever
	// prefixes these characters — a name like "'t Hooft" must survive.
	return String(value ?? "")
		.replace(/^'(?=[=+\-@\t\r])/, "")
		.trim();
}

function nonEmptyCount(row: string[]): number {
	return row.filter(Boolean).length;
}

function uniqueColumns(row: string[]): string[] {
	const seen = new Map<string, number>();
	return row.map((name, index) => {
		const base = name || `Column ${index + 1}`;
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		return count === 0 ? base : `${base} (${count + 1})`;
	});
}

function readWorkbook(buffer: Buffer): XLSX.WorkBook {
	try {
		return XLSX.read(buffer, { type: "buffer" });
	} catch {
		throw new Response("The file could not be read as a spreadsheet", {
			status: 400,
		});
	}
}

export function parseSheetBuffer(buffer: Buffer): Sheet {
	const workbook = readWorkbook(buffer);
	const name = workbook.SheetNames[0];
	const worksheet = name ? workbook.Sheets[name] : undefined;
	if (!worksheet) {
		throw new Response("The file has no sheets", { status: 400 });
	}

	// raw:false keeps dates as the text the admin sees in Excel.
	const grid: string[][] = XLSX.utils
		.sheet_to_json<SheetCell[]>(worksheet, {
			header: 1,
			raw: false,
			defval: "",
			blankrows: true,
		})
		.map((row) => row.map(cell));

	// Two filled cells, so a title line above the table is not mistaken for the
	// header; a genuinely single-column file has no such line to confuse us.
	const multiColumn = grid.findIndex((row) => nonEmptyCount(row) >= 2);
	const headerIndex =
		multiColumn === -1
			? grid.findIndex((row) => nonEmptyCount(row) > 0)
			: multiColumn;
	const header = grid[headerIndex];
	if (!header) {
		throw new Response("No header row found in the file", { status: 400 });
	}

	const columns = uniqueColumns(header);
	const body = grid.slice(headerIndex + 1);
	// Interior blanks are kept so a row number still counts to the same line the
	// admin sees; analyzeSheetEmails ignores them.
	while (body.length > 0 && nonEmptyCount(body[body.length - 1] ?? []) === 0) {
		body.pop();
	}
	const rows = body.map((row) =>
		Array.from({ length: columns.length }, (_, i) => row[i] ?? ""),
	);

	if (rows.every((row) => nonEmptyCount(row) === 0)) {
		throw new Response("The file has a header but no rows", { status: 400 });
	}
	if (rows.length > MAX_SHEET_ROWS) {
		throw new Response(`The file has more than ${MAX_SHEET_ROWS} rows`, {
			status: 400,
		});
	}

	return { columns, rows, headerRow: headerIndex };
}
