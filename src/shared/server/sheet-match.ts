import { analyzeSheetEmails } from "@/shared/lib/sheet-analysis";
import type { Sheet, SheetMatchResult } from "@/shared/lib/sheet-mapping";
import { prisma } from "@/shared/server/db.server";

export async function matchSheetRows(input: {
	sheet: Sheet;
	emailColumn: number;
}): Promise<SheetMatchResult> {
	const { emails, problems, emptyCells } = analyzeSheetEmails(
		input.sheet,
		input.emailColumn,
	);

	// Insensitive, not exact: an account stored with any uppercase would silently
	// import as a stranger. Sheets are capped at MAX_SHEET_ROWS, so the scan is bounded.
	const users = await prisma.user.findMany({
		where: {
			email: {
				in: [...new Set(emails.map((e) => e.email))],
				mode: "insensitive",
			},
		},
		select: { id: true, email: true, firstName: true, lastName: true },
	});
	const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

	const rows = emails.map(({ row, email }) => {
		const user = byEmail.get(email);
		return user
			? {
					kind: "user" as const,
					row,
					email,
					userId: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
				}
			: { kind: "unknown" as const, row, email };
	});

	return { rows, problems, emptyCells };
}
