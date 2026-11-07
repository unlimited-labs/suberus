import { z } from "zod";
import { HEX_COLOR } from "@/features/planner/validations";
import { BOOK_SIZES, PRINT_LANGUAGES } from "./print-options-schema";

export const PARAGRAPH_STYLES = [
	"Title",
	"Subtitle",
	"PartHeading",
	"DayHeading",
	"SessionHeading",
	"SessionMeta",
	"ChairLine",
	"SlotTitle",
	"SlotAuthors",
	"BreakLine",
	"EventTitle",
	"EventText",
	"GridHeader",
	"GridTime",
	"GridCell",
	"GridBand",
	"Legend",
	"IndexLetter",
	"IndexEntry",
	"TocEntry1",
	"TocEntry2",
] as const;

export const CHARACTER_STYLES = [
	"Code",
	"Time",
	"Presenter",
	"Presenting",
	"Cancelled",
	"Badge",
	"Invited",
] as const;

export type ParagraphStyle = (typeof PARAGRAPH_STYLES)[number];
export type CharacterStyle = (typeof CHARACTER_STYLES)[number];

const hexColor = z.string().regex(HEX_COLOR);

const runSchema = z.object({
	text: z.string(),
	charStyle: z.enum(CHARACTER_STYLES).optional(),
	color: hexColor.optional(),
});

const paragraphSchema = z.object({
	type: z.literal("paragraph"),
	style: z.enum(PARAGRAPH_STYLES),
	runs: z.array(runSchema),
});

const tableSchema = z.object({
	type: z.literal("table"),
	columns: z.array(z.object({ widthWeight: z.number().positive() })),
	headerRows: z.number().int().min(0),
	rowCount: z.number().int().min(0),
	cells: z.array(
		z.object({
			row: z.number().int().min(0),
			col: z.number().int().min(0),
			rowSpan: z.number().int().min(1),
			colSpan: z.number().int().min(1),
			accent: hexColor.nullable(),
			blocks: z.array(paragraphSchema),
		}),
	),
});

const tocSchema = z.object({ type: z.literal("toc"), title: z.string() });

const imageSchema = z.object({
	type: z.literal("image"),
	mime: z.enum(["image/png", "image/jpeg"]),
	dataBase64: z.string(),
	widthFraction: z.number().gt(0).max(1),
	aspectRatio: z.number().positive(),
});

const blockSchema = z.discriminatedUnion("type", [
	paragraphSchema,
	tableSchema,
	tocSchema,
	imageSchema,
]);

const sectionSchema = z.object({
	page: z.object({
		size: z.enum(BOOK_SIZES),
		orientation: z.enum(["portrait", "landscape"]),
	}),
	columns: z.union([z.literal(1), z.literal(2)]),
	start: z.enum(["nextPage", "evenPage"]),
	blocks: z.array(blockSchema),
});

export const printDocumentSchema = z.object({
	schemaVersion: z.literal(1),
	draft: z.boolean(),
	language: z.enum(PRINT_LANGUAGES),
	footer: z.string(),
	swatches: z.array(z.object({ name: z.string(), color: hexColor })),
	sections: z.array(sectionSchema),
});

export type PrintDocument = z.infer<typeof printDocumentSchema>;
export type PrintSection = PrintDocument["sections"][number];
export type PrintBlock = PrintSection["blocks"][number];
export type PrintParagraph = Extract<PrintBlock, { type: "paragraph" }>;
export type PrintTable = Extract<PrintBlock, { type: "table" }>;
export type PrintRun = PrintParagraph["runs"][number];
