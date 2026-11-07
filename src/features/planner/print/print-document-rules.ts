import {
	HEX_COLOR,
	type PrintBlock,
	type PrintDocument,
	type PrintParagraph,
	type PrintRun,
	type PrintSection,
	type PrintTable,
} from "./print-document-schema";
import type { DayGrid } from "./print-grid-rules";
import { byAt, groupBy } from "./print-grid-rules";
import { PRINT_LABELS, type PrintLabels } from "./print-labels";
import type { GlanceLayout, PrintOptions } from "./print-options-schema";
import type {
	PrintDay,
	PrintProgram,
	PrintSession,
} from "./print-program-rules";

type BookSize = PrintOptions["bookSize"];
type Orientation = PrintSection["page"]["orientation"];

const GLANCE_LIMITS = {
	A4: { landscapeFrom: 5, maxColumns: 8, maxSpread: 14 },
	B5: { landscapeFrom: 5, maxColumns: 7, maxSpread: 12 },
	A5: { landscapeFrom: 4, maxColumns: 6, maxSpread: 10 },
} satisfies Record<
	BookSize,
	{ landscapeFrom: number; maxColumns: number; maxSpread: number }
>;

export const PAGE_MM = {
	A4: [210, 297],
	B5: [176, 250],
	A5: [148, 210],
} satisfies Record<BookSize, [number, number]>;
export const MARGIN_MM = 15;
export const FOOTER_MM = 10;
export const PX_PER_MM = 3.7795;

export function contentSizeMm(page: PrintSection["page"]): [number, number] {
	const [w, h] = pageSizeMm(page);
	return [w - 2 * MARGIN_MM, h - 2 * MARGIN_MM - FOOTER_MM];
}

export function pageSizeMm(page: PrintSection["page"]): [number, number] {
	const [w, h] = PAGE_MM[page.size];
	return page.orientation === "landscape" ? [h, w] : [w, h];
}

interface GlanceChoice {
	layout: GlanceLayout;
	orientation: Orientation;
}

export function chooseGlanceLayout(
	columnCount: number,
	bookSize: BookSize,
	override: PrintOptions["layoutOverride"],
): GlanceChoice {
	const limits = GLANCE_LIMITS[bookSize];
	const columnsOrientation: Orientation =
		columnCount >= limits.landscapeFrom ? "landscape" : "portrait";
	const layout: GlanceLayout =
		override !== "auto"
			? override
			: columnCount <= limits.maxColumns
				? "columns"
				: columnCount <= limits.maxSpread
					? "spread"
					: "transposed";
	const orientation: Orientation =
		layout === "columns"
			? columnsOrientation
			: layout === "transposed"
				? "landscape"
				: "portrait";
	return { layout, orientation };
}

export function coveredCells(
	cells: readonly {
		row: number;
		col: number;
		rowSpan: number;
		colSpan: number;
	}[],
): Set<string> {
	const covered = new Set<string>();
	for (const c of cells)
		for (let r = c.row; r < c.row + c.rowSpan; r++)
			for (let k = c.col; k < c.col + c.colSpan; k++)
				if (r !== c.row || k !== c.col) covered.add(`${r}:${k}`);
	return covered;
}

export type PrintLogo = Omit<
	Extract<PrintBlock, { type: "image" }>,
	"type" | "widthFraction"
>;

const para = (
	style: PrintParagraph["style"],
	...runs: PrintRun[]
): PrintParagraph => ({
	type: "paragraph",
	style,
	runs,
});
// XML 1.0 forbids these; one pasted from Word corrupts the docx and fails the IDML build.
const XML_ALLOWED_CONTROLS = new Set(["\t", "\n", "\r"]);
const xmlSafe = (text: string) =>
	[...text].filter((c) => c >= " " || XML_ALLOWED_CONTROLS.has(c)).join("");
const run = (raw: string, charStyle?: PrintRun["charStyle"]): PrintRun => {
	const text = xmlSafe(raw);
	return charStyle ? { text, charStyle } : { text };
};
const accentOf = (color: string | null | undefined, on: boolean) =>
	on && color && HEX_COLOR.test(color) ? color : null;

interface TableCellInput {
	row: number;
	col: number;
	rowSpan?: number;
	colSpan?: number;
	accent?: string | null;
	block: PrintParagraph;
}

function table(
	weights: number[],
	headerRows: number,
	rowCount: number,
	cells: TableCellInput[],
): PrintTable {
	return {
		type: "table",
		columns: weights.map((widthWeight) => ({ widthWeight })),
		headerRows,
		rowCount,
		cells: cells.map((c) => ({
			row: c.row,
			col: c.col,
			rowSpan: c.rowSpan ?? 1,
			colSpan: c.colSpan ?? 1,
			accent: c.accent ?? null,
			blocks: [c.block],
		})),
	};
}

function cellParagraph(
	cell: DayGrid["cells"][number],
	suffix = "",
): PrintParagraph {
	const paragraphStyle: PrintParagraph["style"] = cell.band
		? "GridBand"
		: "GridCell";
	return cell.code
		? para(
				paragraphStyle,
				run(`${cell.code} `, "Code"),
				run(`${cell.title}${suffix}`),
			)
		: para(paragraphStyle, run(`${cell.title}${suffix}`));
}

function columnsTable(
	grid: DayGrid,
	l: PrintLabels,
	colorOn: boolean,
	from = 0,
	to = grid.columns.length,
): PrintTable {
	const cols = grid.columns.slice(from, to);
	const header: TableCellInput[] = [
		{ row: 0, col: 0, block: para("GridHeader", run(l.time)) },
		...cols.flatMap((c, i) =>
			c.lane === 1 || i === 0
				? [
						{
							row: 0,
							col: i + 1,
							colSpan: Math.min(c.lanes - c.lane + 1, cols.length - i),
							block: para("GridHeader", run(c.room)),
						},
					]
				: [],
		),
	];
	const times = grid.rows.map((r, i) => ({
		row: i + 1,
		col: 0,
		block: para("GridTime", run(r)),
	}));
	const body = grid.cells.flatMap((c): TableCellInput[] => {
		const start = c.col;
		const end = c.col + c.colSpan;
		if (end <= from || start >= to) return [];
		return [
			{
				row: c.row + 1,
				col: Math.max(start, from) - from + 1,
				rowSpan: c.rowSpan,
				colSpan: Math.min(end, to) - Math.max(start, from),
				accent: c.band ? null : accentOf(c.trackColor, colorOn),
				block: cellParagraph(c),
			},
		];
	});
	return table([0.6, ...cols.map(() => 1)], 1, grid.rows.length + 1, [
		...header,
		...times,
		...body,
	]);
}

function transposedTable(
	grid: DayGrid,
	l: PrintLabels,
	colorOn: boolean,
): PrintTable {
	const header: TableCellInput[] = [
		{ row: 0, col: 0, block: para("GridHeader", run(l.room)) },
		...grid.rows.map((r, i) => ({
			row: 0,
			col: i + 1,
			block: para("GridTime", run(r)),
		})),
	];
	const rooms = grid.columns.map((c, i) => ({
		row: i + 1,
		col: 0,
		block: para(
			"GridHeader",
			run(c.lanes > 1 ? `${c.room} (${c.lane})` : c.room),
		),
	}));
	const body = grid.cells.map((c) => ({
		row: c.col + 1,
		col: c.row + 1,
		rowSpan: c.colSpan,
		colSpan: c.rowSpan,
		accent: c.band ? null : accentOf(c.trackColor, colorOn),
		block: cellParagraph(c),
	}));
	return table([1.2, ...grid.rows.map(() => 1)], 1, grid.columns.length + 1, [
		...header,
		...rooms,
		...body,
	]);
}

function listBlocks(grid: DayGrid): PrintParagraph[] {
	const byRow = groupBy(grid.cells, (c) => c.row);
	return grid.rows.flatMap((r, i) => {
		const cells = byRow.get(i) ?? [];
		if (cells.length === 0) return [];
		return [
			para("GridTime", run(r)),
			...cells.map((c) =>
				cellParagraph(c, c.band ? "" : ` · ${grid.columns[c.col]?.room ?? ""}`),
			),
		];
	});
}

function splitPoint(grid: DayGrid): number | null {
	const half = Math.ceil(grid.columns.length / 2);
	const roomStarts = grid.columns.flatMap((c, i) =>
		i > 0 && c.lane === 1 ? [i] : [],
	);
	return roomStarts.find((i) => i >= half) ?? roomStarts.at(-1) ?? null;
}

function swatchesOf(
	program: PrintProgram,
	options: PrintOptions,
): PrintDocument["swatches"] {
	return program.tracks.flatMap((t) => {
		const color = accentOf(t.color, options.trackColor);
		return color ? [{ name: t.name, color }] : [];
	});
}

function legend(swatches: PrintDocument["swatches"]): PrintParagraph[] {
	if (swatches.length === 0) return [];
	return [
		para(
			"Legend",
			...swatches.flatMap((s, i): PrintRun[] => [
				{ text: `${i > 0 ? "   " : ""}■ `, color: s.color },
				run(s.name),
			]),
		),
	];
}

function section(
	program: PrintProgram,
	options: PrintOptions,
	blocks: PrintBlock[],
	extra: Partial<Pick<PrintSection, "columns" | "start">> & {
		orientation?: Orientation;
	} = {},
): PrintSection {
	return {
		page: {
			size: options.bookSize,
			orientation: extra.orientation ?? "portrait",
		},
		columns: extra.columns ?? 1,
		start: extra.start ?? "nextPage",
		footer: xmlSafe(program.conferenceName),
		blocks,
	};
}

function glanceSections(
	program: PrintProgram,
	options: PrintOptions,
	l: PrintLabels,
	swatches: PrintDocument["swatches"],
): PrintSection[] {
	return program.days.flatMap((day, i): PrintSection[] => {
		const lead: PrintBlock[] =
			i === 0
				? [para("PartHeading", run(l.parts.glance)), ...legend(swatches)]
				: [];
		const heading = para("DayHeading", run(day.label));
		const choice = chooseGlanceLayout(
			day.grid.columns.length,
			options.bookSize,
			options.layoutOverride,
		);
		const color = options.trackColor;
		const at = choice.layout === "spread" ? splitPoint(day.grid) : null;
		if (at !== null) {
			return [
				section(
					program,
					options,
					[...lead, heading, columnsTable(day.grid, l, color, 0, at)],
					{ start: "evenPage" },
				),
				section(program, options, [columnsTable(day.grid, l, color, at)]),
			];
		}
		const body: PrintBlock[] =
			choice.layout === "transposed"
				? [transposedTable(day.grid, l, color)]
				: choice.layout === "list"
					? listBlocks(day.grid)
					: [columnsTable(day.grid, l, color)];
		return [
			section(program, options, [...lead, heading, ...body], {
				orientation: choice.orientation,
			}),
		];
	});
}

function sessionBlocks(s: PrintSession, l: PrintLabels): PrintParagraph[] {
	const meta = [s.timeLabel, s.room, s.track?.name].filter(Boolean).join(" · ");
	const chairs =
		s.chairs.length > 0
			? [
					para(
						"ChairLine",
						run(
							`${s.chairs.length > 1 ? l.chairs : l.chair}: ${s.chairs.join(", ")}`,
						),
					),
				]
			: [];
	const slots = s.slots.flatMap((slot) => {
		const lead = slot.timeLabel ?? slot.board;
		const titleRuns: PrintRun[] = [
			...(lead ? [run(`${lead} `, "Time")] : []),
			run(slot.title, slot.cancelled ? "Cancelled" : undefined),
			...(slot.invited ? [run(` ${l.invited}`, "Invited")] : []),
			...(slot.badge ? [run(` ${slot.badge}`, "Badge")] : []),
		];
		const authorRuns = slot.authors.flatMap((a, i): PrintRun[] => [
			...(i > 0 ? [run(", ")] : []),
			run(a.name, a.presenting ? "Presenter" : undefined),
		]);
		return [
			para("SlotTitle", ...titleRuns),
			...(authorRuns.length > 0 ? [para("SlotAuthors", ...authorRuns)] : []),
		];
	});
	return [
		para("SessionHeading", run(`${s.code} `, "Code"), run(s.title)),
		para("SessionMeta", run(meta)),
		...chairs,
		...slots,
	];
}

function dayBlocks(day: PrintDay, l: PrintLabels): PrintParagraph[] {
	const entries = [
		...day.sessions.map((s) => ({
			at: s.startAt,
			blocks: sessionBlocks(s, l),
		})),
		...day.items.map((x) => ({
			at: x.startAt,
			blocks: [
				para(
					x.kind === "EVENT" ? "EventTitle" : "BreakLine",
					run(`${x.timeLabel} `, "Time"),
					run(x.title),
					run(x.place ? ` · ${x.place}` : ""),
				),
				...(x.description ? [para("EventText", run(x.description))] : []),
			],
		})),
	];
	return [
		para("DayHeading", run(day.label)),
		...entries.toSorted(byAt).flatMap((e) => e.blocks),
	];
}

function indexBlocks(program: PrintProgram, l: PrintLabels): PrintParagraph[] {
	let letter = "";
	return [
		para("PartHeading", run(l.parts.index)),
		...program.authorIndex.flatMap((e) => {
			const first = e.name.charAt(0).toLocaleUpperCase();
			const head = first !== letter ? [para("IndexLetter", run(first))] : [];
			letter = first;
			const refs = e.refs.flatMap((r, i): PrintRun[] => [
				...(i > 0 ? [run(", ")] : []),
				run(r.code, r.presenting ? "Presenting" : undefined),
			]);
			return [...head, para("IndexEntry", run(`${e.name} — `), ...refs)];
		}),
	];
}

export function buildPrintDocument(
	program: PrintProgram,
	options: PrintOptions,
	logo: PrintLogo | null,
): PrintDocument {
	const l = PRINT_LABELS[options.language];
	const has = (part: PrintOptions["parts"][number]) =>
		options.parts.includes(part);
	const swatches = swatchesOf(program, options);
	const sections: PrintSection[] = [];
	if (has("title")) {
		const logoBlock: PrintBlock[] =
			logo && options.showLogo
				? [{ type: "image", ...logo, widthFraction: 0.35 }]
				: [];
		sections.push(
			section(program, options, [
				...logoBlock,
				para("Title", run(program.conferenceName)),
				...(program.datesLabel
					? [para("Subtitle", run(program.datesLabel))]
					: []),
				{ type: "toc", title: l.parts.contents },
			]),
		);
	}
	if (has("glance"))
		sections.push(...glanceSections(program, options, l, swatches));
	if (has("detailed"))
		sections.push(
			...program.days.map((day, i) =>
				section(program, options, [
					...(i === 0 ? [para("PartHeading", run(l.parts.detailed))] : []),
					...dayBlocks(day, l),
				]),
			),
		);
	if (has("index"))
		sections.push(
			section(program, options, indexBlocks(program, l), { columns: 2 }),
		);
	return {
		schemaVersion: 1,
		draft: program.draft,
		language: options.language,
		swatches,
		sections,
	};
}
