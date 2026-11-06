import type {
	PrintBlock,
	PrintDocument,
	PrintParagraph,
	PrintRun,
	PrintSection,
	PrintTable,
} from "./print-document-schema";
import { PRINT_LABELS } from "./print-labels";
import type { GlanceLayout, PrintOptions } from "./print-options-schema";
import type {
	DayGrid,
	PrintDay,
	PrintProgram,
	PrintSession,
} from "./print-program-rules";

type BookSize = PrintOptions["bookSize"];
type Orientation = PrintSection["page"]["orientation"];
type Labels = (typeof PRINT_LABELS)["en"];

const GLANCE_LIMITS = {
	A4: { landscapeFrom: 5, maxColumns: 8, maxSpread: 14 },
	B5: { landscapeFrom: 5, maxColumns: 7, maxSpread: 12 },
	A5: { landscapeFrom: 4, maxColumns: 6, maxSpread: 10 },
} satisfies Record<
	BookSize,
	{ landscapeFrom: number; maxColumns: number; maxSpread: number }
>;

const HEX = /^#[0-9a-fA-F]{6}$/;

export const PAGE_MM = {
	A4: [210, 297],
	B5: [176, 250],
	A5: [148, 210],
} satisfies Record<BookSize, [number, number]>;
export const MARGIN_MM = 15;
export const FOOTER_MM = 10;

export interface GlanceChoice {
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

export interface DocumentContext {
	logo: {
		mime: "image/png" | "image/jpeg";
		dataBase64: string;
		aspectRatio: number;
	} | null;
}

const para = (
	style: PrintParagraph["style"],
	...runs: PrintRun[]
): PrintParagraph => ({
	type: "paragraph",
	style,
	runs,
});
const run = (text: string, charStyle?: PrintRun["charStyle"]): PrintRun =>
	charStyle ? { text, charStyle } : { text };
const accentOf = (color: string | null | undefined, on: boolean) =>
	on && color && HEX.test(color) ? color : null;

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

function cellParagraph(cell: DayGrid["cells"][number]): PrintParagraph {
	if (cell.band) return para("GridBand", run(cell.title));
	return cell.code
		? para("GridCell", run(`${cell.code} `, "Code"), run(cell.title))
		: para("GridCell", run(cell.title));
}

function columnsTable(
	grid: DayGrid,
	l: Labels,
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
		block: para("GridTime", run(`${r.start}–${r.end}`)),
	}));
	const width = Math.max(1, cols.length);
	if (cols.length === 0)
		header.push({ row: 0, col: 1, block: para("GridHeader", run("")) });
	const body = grid.cells.flatMap((c): TableCellInput[] => {
		const start = c.band ? from : c.col;
		const end = c.band ? from + width : c.col + c.colSpan;
		if (end <= from || start >= from + width) return [];
		return [
			{
				row: c.row + 1,
				col: Math.max(start, from) - from + 1,
				rowSpan: c.rowSpan,
				colSpan: Math.min(end, from + width) - Math.max(start, from),
				accent: c.band ? null : accentOf(c.trackColor, colorOn),
				block: cellParagraph(c),
			},
		];
	});
	return table(
		[0.6, ...Array.from({ length: width }, () => 1)],
		1,
		grid.rows.length + 1,
		[...header, ...times, ...body],
	);
}

function transposedTable(
	grid: DayGrid,
	l: Labels,
	colorOn: boolean,
): PrintTable {
	const header: TableCellInput[] = [
		{ row: 0, col: 0, block: para("GridHeader", run(l.room)) },
		...grid.rows.map((r, i) => ({
			row: 0,
			col: i + 1,
			block: para("GridTime", run(`${r.start}–${r.end}`)),
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
		row: c.band ? 1 : c.col + 1,
		col: c.row + 1,
		rowSpan: c.band ? Math.max(1, grid.columns.length) : 1,
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
	return grid.rows.flatMap((r, i) => {
		const cells = grid.cells.filter((c) => c.row === i);
		if (cells.length === 0) return [];
		return [
			para("GridTime", run(`${r.start}–${r.end}`)),
			...cells.map((c) => {
				const room = c.band ? "" : ` · ${grid.columns[c.col]?.room ?? ""}`;
				return c.code
					? para(
							"GridCell",
							run(`${c.code} `, "Code"),
							run(`${c.title}${room}`),
						)
					: para("GridBand", run(c.title));
			}),
		];
	});
}

function splitPoint(grid: DayGrid): number {
	const half = Math.ceil(grid.columns.length / 2);
	let at = half;
	while (at < grid.columns.length && (grid.columns[at]?.lane ?? 1) > 1) at++;
	return at;
}

function legend(
	program: PrintProgram,
	options: PrintOptions,
): PrintParagraph[] {
	const colored = program.tracks.filter((t) =>
		accentOf(t.color, options.trackColor),
	);
	if (colored.length === 0) return [];
	return [
		para(
			"Legend",
			...colored.flatMap((t, i): PrintRun[] => [
				{
					text: `${i > 0 ? "   " : ""}■ `,
					color: accentOf(t.color, true) ?? undefined,
				},
				run(t.name),
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
		footer: program.conferenceName,
		blocks,
	};
}

function glanceSections(
	program: PrintProgram,
	options: PrintOptions,
	l: Labels,
): PrintSection[] {
	return program.days.flatMap((day, i): PrintSection[] => {
		const lead: PrintBlock[] =
			i === 0
				? [
						para("PartHeading", run(l.parts.glance)),
						...legend(program, options),
					]
				: [];
		const heading = para("DayHeading", run(day.label));
		const choice = chooseGlanceLayout(
			day.grid.columns.length,
			options.bookSize,
			options.layoutOverride,
		);
		const color = options.trackColor;
		if (choice.layout === "spread") {
			const at = splitPoint(day.grid);
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

function sessionBlocks(s: PrintSession, l: Labels): PrintParagraph[] {
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

function dayBlocks(day: PrintDay, l: Labels): PrintParagraph[] {
	const entries = [
		...day.sessions.map((s) => ({
			at: s.startAt,
			blocks: sessionBlocks(s, l),
		})),
		...day.items.map((x) => ({
			at: x.startAt,
			blocks:
				x.kind === "EVENT"
					? [
							para(
								"EventTitle",
								run(`${x.timeLabel} `, "Time"),
								run(x.title),
								run(x.place ? ` · ${x.place}` : ""),
							),
							...(x.description ? [para("EventText", run(x.description))] : []),
						]
					: [
							para(
								"BreakLine",
								run(`${x.timeLabel} `, "Time"),
								run(x.title),
								run(x.place ? ` · ${x.place}` : ""),
							),
						],
		})),
	];
	return [
		para("DayHeading", run(day.label)),
		...entries
			.toSorted((a, b) => a.at.localeCompare(b.at))
			.flatMap((e) => e.blocks),
	];
}

function indexBlocks(program: PrintProgram, l: Labels): PrintParagraph[] {
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
	ctx: DocumentContext,
): PrintDocument {
	const l = PRINT_LABELS[options.language];
	const has = (part: PrintOptions["parts"][number]) =>
		options.parts.includes(part);
	const sections: PrintSection[] = [];
	if (has("title")) {
		const logo: PrintBlock[] =
			ctx.logo && options.showLogo
				? [{ type: "image", ...ctx.logo, widthFraction: 0.35 }]
				: [];
		sections.push(
			section(program, options, [
				...logo,
				para("Title", run(program.conferenceName)),
				...(program.datesLabel
					? [para("Subtitle", run(program.datesLabel))]
					: []),
				{ type: "toc", title: l.parts.contents },
			]),
		);
	}
	if (has("glance")) sections.push(...glanceSections(program, options, l));
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
	const swatches = program.tracks.flatMap((t) => {
		const color = accentOf(t.color, options.trackColor);
		return color ? [{ name: t.name, color }] : [];
	});
	return {
		schemaVersion: 1,
		draft: program.draft,
		language: options.language,
		swatches,
		sections,
	};
}
