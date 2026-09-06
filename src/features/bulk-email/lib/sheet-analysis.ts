import { z } from "zod";
import type {
	EmptyCellWarning,
	MatchedRow,
	Sheet,
	SheetProblem,
} from "../validations";

export interface SheetEmailAnalysis {
	emails: Array<{ row: number; email: string }>;
	problems: SheetProblem[];
	emptyCells: EmptyCellWarning[];
}

export function analyzeSheetEmails(
	sheet: Sheet,
	emailColumn: number,
): SheetEmailAnalysis {
	const emails: Array<{ row: number; email: string }> = [];
	const problems: SheetProblem[] = [];
	const rowsByEmail = new Map<string, number[]>();

	sheet.rows.forEach((row, index) => {
		if (row.every((cell) => !cell.trim())) return;
		const raw = row[emailColumn] ?? "";
		const email = raw.trim().toLowerCase();
		if (!z.email().safeParse(email).success) {
			problems.push({ kind: "invalidEmail", row: index, value: raw });
			return;
		}
		emails.push({ row: index, email });
		rowsByEmail.set(email, [...(rowsByEmail.get(email) ?? []), index]);
	});

	for (const [email, rows] of rowsByEmail) {
		if (rows.length > 1) problems.push({ kind: "duplicateEmail", email, rows });
	}

	const emptyCells = sheet.columns.flatMap((_, column) => {
		if (column === emailColumn) return [];
		const rows = sheet.rows.flatMap((row, index) =>
			row.every((cell) => !cell.trim()) || row[column]?.trim() ? [] : [index],
		);
		return rows.length > 0 ? [{ column, rows }] : [];
	});

	return { emails, problems, emptyCells };
}

export function detectEmailColumn(sheet: Sheet): number {
	const scores = sheet.columns.map(
		(_, column) =>
			sheet.rows.filter(
				(row) => z.email().safeParse(row[column]?.trim()).success,
			).length,
	);
	const best = Math.max(...scores);
	return best === 0 ? 0 : scores.indexOf(best);
}

/** 1-based line the row sits on in the uploaded file. */
export function sheetLine(sheet: Sheet, row: number): number {
	return sheet.headerRow + row + 2;
}

function fold(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

export interface NameDisagreement {
	row: number;
	sheetText: string;
	accountName: string;
}

/**
 * Rows matched by email whose cells never mention the account's name — the only
 * pairs worth an admin's eye, since an identical pair says nothing.
 */
export function nameDisagreements(
	sheet: Sheet,
	rows: MatchedRow[],
): NameDisagreement[] {
	return rows.flatMap((matched) => {
		if (matched.kind !== "user") return [];
		const accountName = [matched.firstName, matched.lastName]
			.filter(Boolean)
			.join(" ");
		if (!accountName) return [];
		const cells = sheet.rows[matched.row] ?? [];
		const haystack = fold(cells.join(" "));
		const agrees = accountName
			.split(" ")
			.every((part) => haystack.includes(fold(part)));
		if (agrees) return [];
		const sheetText = cells
			.filter((cell, index) => cell.trim() && !cell.includes("@") && index < 4)
			.slice(0, 2)
			.join(" ");
		return [{ row: matched.row, sheetText, accountName }];
	});
}
