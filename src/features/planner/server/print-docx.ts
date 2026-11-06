import {
	AlignmentType,
	BorderStyle,
	Document,
	Footer,
	Header,
	ImageRun,
	type IParagraphStyleOptions,
	type ICharacterStyleOptions,
	Packer,
	PageNumber,
	PageOrientation,
	Paragraph,
	SectionType,
	ShadingType,
	StyleLevel,
	Table,
	TableCell,
	TableOfContents,
	TableRow,
	TabStopType,
	TextRun,
	WidthType,
} from "docx";
import { estimatePageNumbers } from "docx/layout";
import { TextWatermark } from "docx/watermarks";
import {
	FOOTER_MM,
	MARGIN_MM,
	PAGE_MM,
} from "@/features/planner/print/print-document-rules";
import type {
	ParagraphStyle,
	PrintBlock,
	PrintDocument,
	PrintParagraph,
	PrintSection,
	PrintTable,
} from "@/features/planner/print/print-document-schema";

const FONT = "Arial";
const TWIP_PER_MM = 56.6929;
const PX_PER_MM = 3.7795;

const P = (
	id: ParagraphStyle,
	size: number,
	extra: Partial<IParagraphStyleOptions> = {},
): IParagraphStyleOptions => ({
	id,
	name: id,
	basedOn: "Normal",
	quickFormat: true,
	...extra,
	run: { font: FONT, size: size * 2, ...extra.run },
});

const PARAGRAPH_STYLES: IParagraphStyleOptions[] = [
	P("Title", 22, { run: { bold: true } }),
	P("Subtitle", 13, { paragraph: { spacing: { after: 240 } } }),
	P("PartHeading", 17, {
		run: { bold: true },
		paragraph: { outlineLevel: 0, spacing: { after: 160 } },
	}),
	P("DayHeading", 13, {
		run: { bold: true },
		paragraph: {
			outlineLevel: 1,
			spacing: { before: 80, after: 120 },
			keepNext: true,
		},
	}),
	P("SessionHeading", 10.5, {
		run: { bold: true },
		paragraph: { spacing: { before: 180 }, keepNext: true },
	}),
	P("SessionMeta", 8.5, { paragraph: { keepNext: true } }),
	P("ChairLine", 8.5, {
		run: { italics: true },
		paragraph: { keepNext: true },
	}),
	P("SlotTitle", 9, { paragraph: { spacing: { before: 60 }, keepNext: true } }),
	P("SlotAuthors", 8, { run: { color: "444444" } }),
	P("BreakLine", 9, {
		run: { italics: true },
		paragraph: { spacing: { before: 120 } },
	}),
	P("EventTitle", 9, {
		run: { bold: true },
		paragraph: { spacing: { before: 120 }, keepNext: true },
	}),
	P("EventText", 8.5),
	P("GridHeader", 7.5, { run: { bold: true } }),
	P("GridTime", 7),
	P("GridCell", 7),
	P("GridBand", 7.5, {
		run: { bold: true },
		paragraph: { alignment: AlignmentType.CENTER },
	}),
	P("Legend", 7.5, { paragraph: { spacing: { after: 120 } } }),
	P("IndexLetter", 11, {
		run: { bold: true },
		paragraph: { spacing: { before: 120 }, keepNext: true },
	}),
	P("IndexEntry", 8),
	P("TocEntry1", 10),
	P("TocEntry2", 9, { paragraph: { indent: { left: 240 } } }),
];

const C = (
	id: string,
	run: ICharacterStyleOptions["run"],
): ICharacterStyleOptions => ({
	id,
	name: id,
	basedOn: "DefaultParagraphFont",
	run,
});

const CHARACTER_STYLES: ICharacterStyleOptions[] = [
	C("Code", { bold: true }),
	C("Time", { bold: true }),
	C("Presenter", { underline: {} }),
	C("Presenting", { bold: true }),
	C("Cancelled", { strike: true }),
	C("Badge", { bold: true, smallCaps: true }),
	C("Invited", { bold: true, smallCaps: true }),
];

const hex = (color: string) => color.replace("#", "").toUpperCase();

// Word toggles bold when a bold character style meets a bold paragraph; direct bold keeps it bold.
const BOLD_CHARACTER_STYLES = new Set([
	"Code",
	"Time",
	"Presenting",
	"Badge",
	"Invited",
]);

function paragraph(p: PrintParagraph): Paragraph {
	return new Paragraph({
		style: p.style,
		children: p.runs.map(
			(r) =>
				new TextRun({
					text: r.text,
					style: r.charStyle,
					bold:
						r.charStyle && BOLD_CHARACTER_STYLES.has(r.charStyle)
							? true
							: undefined,
					color: r.color ? hex(r.color) : undefined,
				}),
		),
	});
}

function contentWidthMm(section: PrintSection): number {
	const [w, h] = PAGE_MM[section.page.size];
	return (section.page.orientation === "landscape" ? h : w) - 2 * MARGIN_MM;
}

function tableCell(cell: PrintTable["cells"][number] | undefined): TableCell {
	if (!cell)
		return new TableCell({
			shading: {
				type: ShadingType.DIAGONAL_STRIPE,
				color: "D9D9D9",
				fill: "FFFFFF",
			},
			children: [new Paragraph({ style: "GridCell" })],
		});
	return new TableCell({
		rowSpan: cell.rowSpan,
		columnSpan: cell.colSpan,
		borders: cell.accent
			? {
					left: {
						style: BorderStyle.SINGLE,
						size: 24,
						color: hex(cell.accent),
					},
				}
			: undefined,
		children: cell.blocks.map(paragraph),
	});
}

function table(t: PrintTable, widthMm: number): Table {
	const total = t.columns.reduce((a, c) => a + c.widthWeight, 0);
	const covered = new Set<string>();
	for (const c of t.cells)
		for (let r = c.row; r < c.row + c.rowSpan; r++)
			for (let k = c.col; k < c.col + c.colSpan; k++)
				if (r !== c.row || k !== c.col) covered.add(`${r}:${k}`);
	const rows = Array.from({ length: t.rowCount }, (_, r) => {
		const cells = t.columns.flatMap((_, col) => {
			if (covered.has(`${r}:${col}`)) return [];
			return [tableCell(t.cells.find((c) => c.row === r && c.col === col))];
		});
		return new TableRow({
			tableHeader: r < t.headerRows,
			cantSplit: true,
			children: cells,
		});
	});
	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		columnWidths: t.columns.map((c) =>
			Math.round((c.widthWeight / total) * widthMm * TWIP_PER_MM),
		),
		rows,
	});
}

function block(
	b: PrintBlock,
	section: PrintSection,
): Array<Paragraph | Table | TableOfContents> {
	if (b.type === "paragraph") return [paragraph(b)];
	if (b.type === "table")
		return [
			table(b, contentWidthMm(section)),
			new Paragraph({ style: "GridCell" }),
		];
	if (b.type === "toc")
		return [
			new Paragraph({
				style: "Subtitle",
				children: [new TextRun({ text: b.title, bold: true })],
			}),
			new TableOfContents(b.title, {
				hyperlink: true,
				stylesWithLevels: [
					new StyleLevel("PartHeading", 1),
					new StyleLevel("DayHeading", 2),
				],
			}),
		];
	const widthPx = b.widthFraction * contentWidthMm(section) * PX_PER_MM;
	return [
		new Paragraph({
			children: [
				new ImageRun({
					type: b.mime === "image/png" ? "png" : "jpg",
					data: Buffer.from(b.dataBase64, "base64"),
					transformation: {
						width: Math.round(widthPx),
						height: Math.round(widthPx / b.aspectRatio),
					},
				}),
			],
		}),
	];
}

function section(s: PrintSection, draft: boolean) {
	const [w, h] = PAGE_MM[s.page.size];
	const tabAt = Math.round(contentWidthMm(s) * TWIP_PER_MM);
	return {
		properties: {
			type:
				s.start === "evenPage" ? SectionType.EVEN_PAGE : SectionType.NEXT_PAGE,
			page: {
				size: {
					width: Math.round(w * TWIP_PER_MM),
					height: Math.round(h * TWIP_PER_MM),
					orientation:
						s.page.orientation === "landscape"
							? PageOrientation.LANDSCAPE
							: PageOrientation.PORTRAIT,
				},
				margin: {
					top: Math.round(MARGIN_MM * TWIP_PER_MM),
					bottom: Math.round((MARGIN_MM + FOOTER_MM) * TWIP_PER_MM),
					left: Math.round(MARGIN_MM * TWIP_PER_MM),
					right: Math.round(MARGIN_MM * TWIP_PER_MM),
					footer: Math.round(MARGIN_MM * 0.6 * TWIP_PER_MM),
				},
			},
			column: s.columns === 2 ? { count: 2, space: 340 } : undefined,
		},
		headers: draft
			? {
					default: new Header({
						children: [
							new Paragraph({
								children: [new TextWatermark({ text: "DRAFT", font: FONT })],
							}),
						],
					}),
				}
			: undefined,
		footers: {
			default: new Footer({
				children: [
					new Paragraph({
						tabStops: [{ type: TabStopType.RIGHT, position: tabAt }],
						children: [
							new TextRun({ text: s.footer, font: FONT, size: 14 }),
							new TextRun({
								children: ["\t", PageNumber.CURRENT],
								font: FONT,
								size: 14,
							}),
						],
					}),
				],
			}),
		},
		children: s.blocks.flatMap((b) => block(b, s)),
	};
}

export async function renderDocx(doc: PrintDocument): Promise<Buffer> {
	const document = new Document({
		pageNumbers: estimatePageNumbers,
		styles: {
			default: { document: { run: { font: FONT, size: 18 } } },
			paragraphStyles: PARAGRAPH_STYLES,
			characterStyles: CHARACTER_STYLES,
		},
		sections: doc.sections.map((s) => section(s, doc.draft)),
	});
	return Packer.toBuffer(document);
}
