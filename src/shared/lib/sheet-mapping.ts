import { z } from "zod";
import {
	BUILTIN_PLACEHOLDER_KEYS,
	PLACEHOLDER_KEY_RE,
} from "@/shared/lib/placeholders";

export const MAX_SHEET_ROWS = 5000;

export const sheetSchema = z
	.object({
		columns: z.array(z.string().min(1)).min(1).max(64),
		rows: z.array(z.array(z.string())).min(1).max(MAX_SHEET_ROWS),
		/** 0-based line the header sits on, so row numbers can name the real file row. */
		headerRow: z.number().int().min(0).default(0),
	})
	.superRefine((sheet, ctx) => {
		if (new Set(sheet.columns).size !== sheet.columns.length) {
			ctx.addIssue({ code: "custom", message: "Column names must be unique" });
		}
		if (sheet.rows.some((row) => row.length !== sheet.columns.length)) {
			ctx.addIssue({
				code: "custom",
				message: "Every row must have one cell per column",
			});
		}
	});

export type Sheet = z.infer<typeof sheetSchema>;

export const sheetMatchShape = z.object({
	sheet: sheetSchema,
	emailColumn: z.number().int().min(0),
});

function checkEmailColumn(
	value: { sheet: Sheet; emailColumn: number },
	ctx: z.RefinementCtx,
): void {
	if (value.emailColumn >= value.sheet.columns.length) {
		ctx.addIssue({ code: "custom", message: "Email column is out of range" });
	}
}

export const sheetMatchInput = sheetMatchShape.superRefine(checkEmailColumn);

export const mappingTargetSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("data"),
		key: z
			.string()
			.regex(
				PLACEHOLDER_KEY_RE,
				"Use letters, digits and _ , starting with a letter",
			)
			.refine(
				(key) => !BUILTIN_PLACEHOLDER_KEYS.some((k) => k === key),
				"That key is reserved",
			),
	}),
	z.object({
		kind: z.literal("builtin"),
		field: z.enum(["firstName", "lastName"]),
	}),
]);

export type MappingTarget = z.infer<typeof mappingTargetSchema>;

/**
 * The columns-to-placeholders shape both importers share. Kept as a plain object
 * so a feature that cannot take strangers (announcements need an account) can
 * `.omit({ unmatched: true })` before attaching the refinement.
 */
export const sheetCreateShape = sheetMatchShape.extend({
	mapping: z.array(
		z.object({
			column: z.number().int().min(0),
			target: mappingTargetSchema,
		}),
	),
	unmatched: z.enum(["add", "skip"]),
});

export type SheetMapping = z.infer<typeof sheetCreateShape>["mapping"];

export function refineSheetCreate(
	value: { sheet: Sheet; emailColumn: number; mapping: SheetMapping },
	ctx: z.RefinementCtx,
): void {
	checkEmailColumn(value, ctx);
	const columns = value.mapping.map((m) => m.column);
	if (columns.some((c) => c >= value.sheet.columns.length)) {
		ctx.addIssue({ code: "custom", message: "Mapped column is out of range" });
	}
	if (columns.includes(value.emailColumn)) {
		ctx.addIssue({
			code: "custom",
			message: "The email column cannot also be a placeholder",
		});
	}
	if (new Set(columns).size !== columns.length) {
		ctx.addIssue({ code: "custom", message: "Each column maps only once" });
	}
	const keys = value.mapping.flatMap((m) =>
		m.target.kind === "data" ? [m.target.key] : [],
	);
	if (new Set(keys).size !== keys.length) {
		ctx.addIssue({
			code: "custom",
			message: "Placeholder keys must be unique",
		});
	}
	const fields = value.mapping.flatMap((m) =>
		m.target.kind === "builtin" ? [m.target.field] : [],
	);
	if (new Set(fields).size !== fields.length) {
		ctx.addIssue({
			code: "custom",
			message: "First name and last name take one column each",
		});
	}
}

export type MatchedRow =
	| {
			kind: "user";
			row: number;
			email: string;
			userId: string;
			firstName: string | null;
			lastName: string | null;
	  }
	| { kind: "unknown"; row: number; email: string };

export type SheetProblem =
	| { kind: "invalidEmail"; row: number; value: string }
	| { kind: "duplicateEmail"; email: string; rows: number[] }
	/** Raised only by importers that cannot take an address without an account. */
	| { kind: "noAccount"; row: number; email: string };

export interface EmptyCellWarning {
	column: number;
	rows: number[];
}

export interface SheetMatchResult {
	rows: MatchedRow[];
	problems: SheetProblem[];
	emptyCells: EmptyCellWarning[];
}
