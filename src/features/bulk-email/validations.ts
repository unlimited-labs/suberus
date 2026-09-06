import { z } from "zod";
import {
	BUILTIN_PLACEHOLDER_KEYS,
	PLACEHOLDER_KEY_RE,
} from "./lib/placeholders";

export const campaignFormatSchema = z.enum(["PLAIN", "MARKDOWN", "MJML"]);

export const campaignIdInput = z.object({ id: z.uuid() });

export const campaignCreateInput = z.object({
	userIds: z.array(z.uuid()).min(1, "No recipients selected"),
});

export const campaignDraftInput = z.object({
	id: z.uuid(),
	subject: z.string(),
	format: campaignFormatSchema,
	bodySource: z.string(),
	replyTo: z.union([z.email(), z.literal("")]).optional(),
});

export const campaignPreviewInput = z.object({
	format: campaignFormatSchema,
	bodySource: z.string(),
});

export const campaignCheckInput = campaignIdInput.extend({
	tokens: z.array(z.string()).max(100),
});

export const MAX_SHEET_ROWS = 5000;

export const sheetSchema = z
	.object({
		columns: z.array(z.string().min(1)).min(1).max(64),
		rows: z.array(z.array(z.string())).min(1).max(MAX_SHEET_ROWS),
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

const sheetMatchShape = z.object({
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

export const sheetCampaignCreateInput = sheetMatchShape
	.extend({
		mapping: z.array(
			z.object({
				column: z.number().int().min(0),
				target: mappingTargetSchema,
			}),
		),
		unmatched: z.enum(["add", "skip"]),
	})
	.superRefine((value, ctx) => {
		checkEmailColumn(value, ctx);
		const columns = value.mapping.map((m) => m.column);
		if (columns.some((c) => c >= value.sheet.columns.length)) {
			ctx.addIssue({
				code: "custom",
				message: "Mapped column is out of range",
			});
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
	});

export type SheetCampaignCreateInput = z.infer<typeof sheetCampaignCreateInput>;

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
	| { kind: "duplicateEmail"; email: string; rows: number[] };

export interface EmptyCellWarning {
	column: number;
	rows: number[];
}

export interface SheetMatchResult {
	rows: MatchedRow[];
	problems: SheetProblem[];
	emptyCells: EmptyCellWarning[];
}

export interface PlaceholderIssues {
	unknown: string[];
	missing: Array<{ key: string; count: number; sample: string[] }>;
}
