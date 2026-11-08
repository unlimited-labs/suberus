import type {
	PrintBlock,
	PrintDocument,
	PrintParagraph,
	PrintRun,
	PrintSection,
	PrintTable,
} from "./print-document-schema";
import type { DayGrid } from "./print-grid-rules";
import { byAt, groupBy } from "./print-grid-rules";
import { PRINT_LABELS, PRINT_LOCALE, type PrintLabels } from "./print-labels";
import {
	type BookSize,
	commaRuns,
	contentSizeMm,
	type Orientation,
	para,
	run,
	section,
	table,
	type TableCellInput,
} from "./print-layout-rules";
import type {
	GlanceLayout,
	PrintLanguage,
	PrintOptions,
} from "./print-options-schema";
import type {
	PrintDay,
	PrintProgram,
	PrintSession,
} from "./print-program-rules";
import { dayGridSection } from "./print-talk-table-rules";

const GLANCE_LIMITS = {
	A4: { landscapeFrom: 5, maxColumns: 8, maxSpread: 14 },
	B5: { landscapeFrom: 5, maxColumns: 7, maxSpread: 12 },
	A5: { landscapeFrom: 4, maxColumns: 6, maxSpread: 10 },
} satisfies Record<
	BookSize,
	{ landscapeFrom: number; maxColumns: number; maxSpread: number }
>;

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

export type PrintLogo = Omit<
	Extract<PrintBlock, { type: "image" }>,
	"type" | "widthFraction"
>;

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

const timeColumnMm = (rows: readonly string[]) =>
	Math.max(16, ...rows.map((r) => r.length * 1.5 + 4));

function columnsTable(
	grid: DayGrid,
	l: PrintLabels,
	widthMm: number,
	from = 0,
	to = grid.columns.length,
): PrintTable {
	const cols = grid.columns.slice(from, to);
	const timeMm = timeColumnMm(grid.rows);
	const roomMm = (widthMm - timeMm) / cols.length;
	const header: TableCellInput[] = [
		{ row: 0, col: 0, blocks: [para("GridHeader", run(l.time))] },
		...cols.flatMap((c, i) =>
			c.lane === 1 || i === 0
				? [
						{
							row: 0,
							col: i + 1,
							colSpan: Math.min(c.lanes - c.lane + 1, cols.length - i),
							blocks: [para("GridHeader", run(c.room))],
						},
					]
				: [],
		),
	];
	const times = grid.rows.map((r, i) => ({
		row: i + 1,
		col: 0,
		blocks: [para("GridTime", run(r))],
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
				accent: c.trackColor,
				blocks: [cellParagraph(c)],
			},
		];
	});
	return table([timeMm, ...cols.map(() => roomMm)], 1, grid.rows.length + 1, [
		...header,
		...times,
		...body,
	]);
}

function transposedTable(grid: DayGrid, l: PrintLabels): PrintTable {
	const header: TableCellInput[] = [
		{ row: 0, col: 0, blocks: [para("GridHeader", run(l.room))] },
		...grid.rows.map((r, i) => ({
			row: 0,
			col: i + 1,
			blocks: [para("GridTime", run(r))],
		})),
	];
	const rooms = grid.columns.map((c, i) => ({
		row: i + 1,
		col: 0,
		blocks: [
			para("GridHeader", run(c.lanes > 1 ? `${c.room} (${c.lane})` : c.room)),
		],
	}));
	const body = grid.cells.map((c) => ({
		row: c.col + 1,
		col: c.row + 1,
		rowSpan: c.colSpan,
		colSpan: c.rowSpan,
		accent: c.trackColor,
		blocks: [cellParagraph(c)],
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

function swatchesOf(program: PrintProgram): PrintDocument["swatches"] {
	return program.tracks.flatMap((t) =>
		t.color ? [{ name: t.name, color: t.color }] : [],
	);
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

function glanceSections(
	program: PrintProgram,
	options: PrintOptions,
	l: PrintLabels,
	swatches: PrintDocument["swatches"],
): PrintSection[] {
	const sections: PrintSection[] = [];
	let flowing = false;
	program.days.forEach((day, i) => {
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
		const page = { size: options.bookSize, orientation: choice.orientation };
		const [widthMm] = contentSizeMm(page);
		const at = choice.layout === "spread" ? splitPoint(day.grid) : null;
		if (at !== null) {
			sections.push(
				section(
					options,
					[...lead, heading, columnsTable(day.grid, l, widthMm, 0, at)],
					{ start: "evenPage" },
				),
				section(options, [columnsTable(day.grid, l, widthMm, at)]),
			);
			flowing = false;
			return;
		}
		const body: PrintBlock[] =
			choice.layout === "transposed"
				? [transposedTable(day.grid, l)]
				: choice.layout === "list"
					? listBlocks(day.grid)
					: [columnsTable(day.grid, l, widthMm)];
		const prev = sections.at(-1);
		if (flowing && prev?.page.orientation === choice.orientation) {
			sections[sections.length - 1] = {
				...prev,
				blocks: [...prev.blocks, heading, ...body],
			};
			return;
		}
		sections.push(
			section(options, [...lead, heading, ...body], {
				orientation: choice.orientation,
			}),
		);
		flowing = true;
	});
	return sections;
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
		const authorRuns = commaRuns(slot.authors, (a) =>
			run(a.name, a.presenting ? "Presenter" : undefined),
		);
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

function indexBlocks(
	program: PrintProgram,
	l: PrintLabels,
	language: PrintLanguage,
): PrintParagraph[] {
	const sameLetter = new Intl.Collator(PRINT_LOCALE[language], {
		sensitivity: "base",
	});
	let letter = "";
	return [
		para("PartHeading", run(l.parts.index)),
		...program.authorIndex.flatMap((e) => {
			const first = e.name.charAt(0).toLocaleUpperCase(PRINT_LOCALE[language]);
			const isNew = letter === "" || sameLetter.compare(first, letter) !== 0;
			const head = isNew ? [para("IndexLetter", run(first))] : [];
			if (isNew) letter = first;
			const refs = commaRuns(e.refs, (r) =>
				run(r.code, r.presenting ? "Presenting" : undefined),
			);
			return [...head, para("IndexEntry", run(`${e.name} — `), ...refs)];
		}),
	];
}

export const wantsLogo = (options: PrintOptions) =>
	options.showLogo && options.parts.includes("title");

export function buildPrintDocument(
	program: PrintProgram,
	options: PrintOptions,
	logo: PrintLogo | null,
): PrintDocument {
	const l = PRINT_LABELS[options.language];
	const has = (part: PrintOptions["parts"][number]) =>
		options.parts.includes(part);
	const swatches = swatchesOf(program);
	const sections: PrintSection[] = [];
	if (has("title")) {
		const logoBlock: PrintBlock[] =
			logo && options.showLogo
				? [{ type: "image", ...logo, widthFraction: 0.35 }]
				: [];
		sections.push(
			section(options, [
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
			...program.days.map((day, i) => {
				const lead =
					i === 0 ? [para("PartHeading", run(l.parts.detailed))] : [];
				return options.detailedLayout === "grid"
					? dayGridSection(day, options, l, [
							...lead,
							...(i === 0 ? legend(swatches) : []),
						])
					: section(options, [...lead, ...dayBlocks(day, l)]);
			}),
		);
	if (has("index"))
		sections.push(
			section(options, indexBlocks(program, l, options.language), {
				columns: 2,
			}),
		);
	return {
		schemaVersion: 1,
		draft: program.draft,
		footer: program.conferenceName,
		language: options.language,
		swatches,
		sections,
	};
}
