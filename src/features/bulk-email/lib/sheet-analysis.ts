import { z } from "zod";
import type { EmptyCellWarning, Sheet, SheetProblem } from "../validations";

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
			row[column]?.trim() ? [] : [index],
		);
		return rows.length > 0 ? [{ column, rows }] : [];
	});

	return { emails, problems, emptyCells };
}
