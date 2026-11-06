import { z } from "zod";

export const PRINT_FORMATS = ["docx", "idml", "xlsx"] as const;
export const PRINT_PARTS = ["title", "glance", "detailed", "index"] as const;
export const BOOK_SIZES = ["A4", "B5", "A5"] as const;
export const GLANCE_LAYOUTS = [
	"columns",
	"spread",
	"transposed",
	"list",
] as const;
export const PRINT_LANGUAGES = ["en", "pl"] as const;

export type PrintFormat = (typeof PRINT_FORMATS)[number];
export type PrintPart = (typeof PRINT_PARTS)[number];
export type GlanceLayout = (typeof GLANCE_LAYOUTS)[number];
export type PrintLanguage = (typeof PRINT_LANGUAGES)[number];

export const printOptionsSchema = z
	.object({
		bookSize: z.enum(BOOK_SIZES).default("A4"),
		trackColor: z.boolean().default(true),
		layoutOverride: z.enum(["auto", ...GLANCE_LAYOUTS]).default("auto"),
		includeCancelled: z.boolean().default(false),
		language: z.enum(PRINT_LANGUAGES).default("en"),
		parts: z.array(z.enum(PRINT_PARTS)).default([...PRINT_PARTS]),
		showLogo: z.boolean().default(true),
	})
	.refine((o) => o.parts.includes("glance") || o.parts.includes("detailed"), {
		path: ["parts"],
		message: "Include Program at a glance or Detailed program.",
	});

export type PrintOptions = z.infer<typeof printOptionsSchema>;
