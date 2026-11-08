import type {
	PrintParagraph,
	PrintSection,
	PrintTable,
} from "./print-document-schema";
import type { PrintBlock } from "./print-document-schema";
import type { PrintLabels } from "./print-labels";
import {
	type BookSize,
	type CellFill,
	contentSizeMm,
	type Orientation,
	para,
	run,
	section,
	table,
	type TableCellInput,
} from "./print-layout-rules";
import type { PrintOptions } from "./print-options-schema";
import type {
	PrintDay,
	PrintItem,
	PrintSession,
	PrintSlot,
} from "./print-program-rules";
import type { TalkBlock, TalkCellContent } from "./print-talk-grid-rules";

const TALK_COLUMNS = {
	A4: { portrait: 3, landscape: 5 },
	B5: { portrait: 3, landscape: 4 },
	A5: { portrait: 2, landscape: 3 },
} satisfies Record<BookSize, Record<Orientation, number>>;
const TALK_TIME_MM = 8;
const POSTER_BOARD_MM = 10;
const NEUTRAL = "#000000";
const BAND_FILL: CellFill = { color: NEUTRAL, tint: 15 };
const HEAD_TINT = { track: 20, neutral: 6 };
const CHAIRS_TINT = { track: 35, neutral: 11 };

const sessionFill = (s: PrintSession, tint: typeof HEAD_TINT): CellFill =>
	s.track?.color
		? { color: s.track.color, tint: tint.track }
		: { color: NEUTRAL, tint: tint.neutral };

function columnChunks(n: number, per: number): [number, number][] {
	const count = Math.ceil(n / per);
	const base = Math.floor(n / count);
	return Array.from({ length: count }, (_, i) => {
		const from = i * base + Math.min(i, n % count);
		return [from, from + base + (i < n % count ? 1 : 0)];
	});
}

const blockHeading = (label: string, plenary: PrintSession | null) =>
	para(
		"BlockHeading",
		run(label, "Time"),
		...(plenary ? [run(`   ${plenary.title}`)] : []),
	);

const sessionHead = (s: PrintSession, plenary: boolean): PrintParagraph[] => [
	...(s.room ? [para("GridRoom", run(s.room))] : []),
	plenary
		? para("GridSession", run(s.code, "Code"))
		: para("GridSession", run(`${s.code} `, "Code"), run(s.title)),
];

const chairsParagraph = (s: PrintSession, l: PrintLabels) =>
	s.chairNames.length > 0
		? para(
				"GridChairs",
				run(`${s.chairNames.length > 1 ? l.chairs : l.chair}: `, "Label"),
				run(s.chairNames.join(", ")),
			)
		: para("GridChairs");

function talkParagraphs(
	slot: PrintSlot,
	l: PrintLabels,
	withTime = false,
): PrintParagraph[] {
	const badge = [slot.invited ? l.invited : null, slot.badge]
		.filter(Boolean)
		.join(" · ");
	const time =
		withTime && slot.timeLabel ? [run(`${slot.timeLabel} `, "Time")] : [];
	const { presenter } = slot;
	return [
		...(badge ? [para("TalkBadge", run(badge))] : []),
		para(
			"TalkTitle",
			...time,
			run(slot.title, slot.cancelled ? "Cancelled" : undefined),
		),
		...(presenter ? [para("TalkPresenter", run(presenter.name))] : []),
		...(presenter?.affiliation
			? [para("TalkAffiliation", run(presenter.affiliation))]
			: []),
	];
}

type TalksBlock = Extract<TalkBlock, { kind: "talks" }>;

function talkCell(
	content: TalkCellContent,
	block: TalksBlock,
	l: PrintLabels,
): Pick<TableCellInput, "fill" | "blocks"> {
	if (content.kind === "head")
		return {
			fill: sessionFill(content.session, HEAD_TINT),
			blocks: sessionHead(content.session, block.plenary !== null),
		};
	if (content.kind === "chairs")
		return {
			fill: sessionFill(content.session, CHAIRS_TINT),
			blocks: [chairsParagraph(content.session, l)],
		};
	if (content.kind === "talk")
		return { blocks: talkParagraphs(content.slot, l, !block.aligned) };
	return { blocks: [para("GridCell")] };
}

// Talk times differ between rooms in an unaligned block, so each talk carries its own time.
function talksTable(
	block: TalksBlock,
	[from, to]: [number, number],
	widthMm: number,
	l: PrintLabels,
): PrintTable {
	const timeMm = block.aligned ? TALK_TIME_MM : 0;
	const lead = block.aligned ? 1 : 0;
	const roomMm = (widthMm - timeMm) / (to - from);
	const band: TableCellInput = {
		row: 0,
		col: 0,
		colSpan: to - from + lead,
		fill: BAND_FILL,
		blocks: [blockHeading(block.label, block.plenary)],
	};
	const times = block.aligned
		? block.rows.map((r, i) => ({
				row: i + 1,
				col: 0,
				blocks: [
					r.kind === "time" ? para("TalkTime", run(r.label)) : para("GridCell"),
				],
			}))
		: [];
	const body = block.cells
		.filter((c) => c.col >= from && c.col < to)
		.map((c) => ({
			row: c.row + 1,
			col: c.col - from + lead,
			rowSpan: c.rowSpan,
			...talkCell(c.content, block, l),
		}));
	const firstTalkRow = block.rows.findIndex((r) => r.kind === "time");
	const rooms = Array.from({ length: to - from }, () => roomMm);
	return table(
		block.aligned ? [timeMm, ...rooms] : rooms,
		1 + Math.max(0, firstTalkRow),
		block.rows.length + 1,
		[band, ...times, ...body],
	);
}

function postersTable(
	s: PrintSession,
	widthMm: number,
	l: PrintLabels,
): PrintTable {
	const head: TableCellInput[] = [
		{
			row: 0,
			col: 0,
			colSpan: 2,
			fill: BAND_FILL,
			blocks: [blockHeading(s.timeLabel, null)],
		},
		{
			row: 1,
			col: 0,
			colSpan: 2,
			fill: sessionFill(s, HEAD_TINT),
			blocks: sessionHead(s, false),
		},
		...(s.chairNames.length > 0
			? [
					{
						row: 2,
						col: 0,
						colSpan: 2,
						fill: sessionFill(s, CHAIRS_TINT),
						blocks: [chairsParagraph(s, l)],
					},
				]
			: []),
	];
	const boards = s.slots.flatMap((slot, i) => [
		{
			row: head.length + i,
			col: 0,
			blocks: [para("GridTime", run(slot.board ?? ""))],
		},
		{ row: head.length + i, col: 1, blocks: talkParagraphs(slot, l) },
	]);
	return table(
		[POSTER_BOARD_MM, widthMm - POSTER_BOARD_MM],
		head.length,
		head.length + s.slots.length,
		[...head, ...boards],
	);
}

function itemTable(item: PrintItem, widthMm: number): PrintTable {
	const heading = para(
		"BlockHeading",
		run(item.timeLabel, "Time"),
		run(`   ${item.title}${item.place ? ` · ${item.place}` : ""}`),
	);
	return table([widthMm], 0, 1, [
		{
			row: 0,
			col: 0,
			fill: BAND_FILL,
			blocks: [
				heading,
				...(item.description ? [para("EventText", run(item.description))] : []),
			],
		},
	]);
}

export function dayGridSection(
	day: PrintDay,
	options: PrintOptions,
	l: PrintLabels,
	lead: PrintBlock[],
): PrintSection {
	const limits = TALK_COLUMNS[options.bookSize];
	const widest = Math.max(
		1,
		...day.talkBlocks.map((b) => (b.kind === "talks" ? b.columns : 1)),
	);
	const orientation: Orientation =
		widest > limits.portrait ? "landscape" : "portrait";
	const [widthMm] = contentSizeMm({ size: options.bookSize, orientation });
	const tables = day.talkBlocks.flatMap((b): PrintTable[] => {
		if (b.kind === "item") return [itemTable(b.item, widthMm)];
		if (b.kind === "posters") return [postersTable(b.session, widthMm, l)];
		return columnChunks(b.columns, limits[orientation]).map((range) =>
			talksTable(b, range, widthMm, l),
		);
	});
	return section(
		options,
		[...lead, para("DayHeading", run(day.label)), ...tables],
		{ orientation },
	);
}
