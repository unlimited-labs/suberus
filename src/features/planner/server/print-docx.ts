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
	PX_PER_MM,
	contentSizeMm,
	tableRows,
} from "@/features/planner/print/print-document-rules";
import type {
	CharacterStyle,
	ParagraphStyle,
	PrintBlock,
	PrintDocument,
	PrintParagraph,
	PrintSection,
	PrintTable,
} from "@/features/planner/print/print-document-schema";

const FONT = "Arial";
const twip = (mm: number) => Math.round(mm * 56.6929);

type StyleSpec<T> = Omit<T, "id" | "name">;

const P = (
	size: number,
	extra: StyleSpec<IParagraphStyleOptions> = {},
): StyleSpec<IParagraphStyleOptions> => ({
	basedOn: "Normal",
	quickFormat: true,
	...extra,
	run: { font: FONT, size: size * 2, ...extra.run },
});

const PARAGRAPH_STYLES = Object.entries({
	Title: P(22, { run: { bold: true } }),
	Subtitle: P(13, { paragraph: { spacing: { after: 240 } } }),
	PartHeading: P(17, {
		run: { bold: true },
		paragraph: { outlineLevel: 0, spacing: { after: 160 } },
	}),
	DayHeading: P(13, {
		run: { bold: true },
		paragraph: {
			outlineLevel: 1,
			spacing: { before: 80, after: 120 },
			keepNext: true,
		},
	}),
	SessionHeading: P(10.5, {
		run: { bold: true },
		paragraph: { spacing: { before: 180 }, keepNext: true },
	}),
	SessionMeta: P(8.5, { paragraph: { keepNext: true } }),
	ChairLine: P(8.5, {
		run: { italics: true },
		paragraph: { keepNext: true },
	}),
	SlotTitle: P(9, { paragraph: { spacing: { before: 60 }, keepNext: true } }),
	SlotAuthors: P(8, { run: { color: "444444" } }),
	BreakLine: P(9, {
		run: { italics: true },
		paragraph: { spacing: { before: 120 } },
	}),
	EventTitle: P(9, {
		run: { bold: true },
		paragraph: { spacing: { before: 120 }, keepNext: true },
	}),
	EventText: P(8.5),
	GridHeader: P(7.5, { run: { bold: true } }),
	GridTime: P(7),
	GridCell: P(7),
	GridBand: P(7.5, {
		run: { bold: true },
		paragraph: { alignment: AlignmentType.CENTER },
	}),
	Legend: P(7.5, { paragraph: { spacing: { after: 120 } } }),
	IndexLetter: P(11, {
		run: { bold: true },
		paragraph: { spacing: { before: 120 }, keepNext: true },
	}),
	IndexEntry: P(8),
	TocEntry1: P(10),
	TocEntry2: P(9, { paragraph: { indent: { left: 240 } } }),
} satisfies Record<ParagraphStyle, StyleSpec<IParagraphStyleOptions>>).map(
	([id, style]): IParagraphStyleOptions => ({ id, name: id, ...style }),
);

const C = (
	run: ICharacterStyleOptions["run"],
): StyleSpec<ICharacterStyleOptions> => ({
	basedOn: "DefaultParagraphFont",
	run,
});

const CHARACTER_STYLES = Object.entries({
	Code: C({ bold: true }),
	Time: C({ bold: true }),
	Presenter: C({ underline: {} }),
	Presenting: C({ bold: true }),
	Cancelled: C({ strike: true }),
	Badge: C({ bold: true, smallCaps: true }),
	Invited: C({ bold: true, smallCaps: true }),
} satisfies Record<CharacterStyle, StyleSpec<ICharacterStyleOptions>>).map(
	([id, style]): ICharacterStyleOptions => ({ id, name: id, ...style }),
);

const hex = (color: string) => color.replace("#", "").toUpperCase();

// Word toggles bold when a bold character style meets a bold paragraph; direct bold keeps it bold.
const BOLD_CHARACTER_STYLES = new Set(
	CHARACTER_STYLES.filter((s) => s.run?.bold).map((s) => s.id),
);

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
	return contentSizeMm(section.page)[0];
}

function tableCell(cell: PrintTable["cells"][number] | null): TableCell {
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
	const rows = tableRows(t.cells, t.columns.length, 0, t.rowCount).map(
		({ row, slots }) =>
			new TableRow({
				tableHeader: row < t.headerRows,
				cantSplit: true,
				children: slots.map((s) => tableCell(s.cell)),
			}),
	);
	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		columnWidths: t.columns.map((c) => twip((c.widthWeight / total) * widthMm)),
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

function section(s: PrintSection, doc: PrintDocument) {
	const [w, h] = PAGE_MM[s.page.size];
	const tabAt = twip(contentWidthMm(s));
	return {
		properties: {
			type:
				s.start === "evenPage" ? SectionType.EVEN_PAGE : SectionType.NEXT_PAGE,
			page: {
				size: {
					width: twip(w),
					height: twip(h),
					orientation:
						s.page.orientation === "landscape"
							? PageOrientation.LANDSCAPE
							: PageOrientation.PORTRAIT,
				},
				margin: {
					top: twip(MARGIN_MM),
					bottom: twip(MARGIN_MM + FOOTER_MM),
					left: twip(MARGIN_MM),
					right: twip(MARGIN_MM),
					footer: twip(MARGIN_MM * 0.6),
				},
			},
			column: s.columns === 2 ? { count: 2, space: 340 } : undefined,
		},
		headers: doc.draft
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
							new TextRun({ text: doc.footer, font: FONT, size: 14 }),
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
		sections: doc.sections.map((s) => section(s, doc)),
	});
	return Packer.toBuffer(document);
}
