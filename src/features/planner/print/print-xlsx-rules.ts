import type { XlsxCell, XlsxSheetSpec } from "@/shared/lib/xlsx-types";
import { HEX_COLOR } from "./print-document-schema";
import { byAt } from "./print-grid-rules";
import {
	capitalizeFirst,
	PRINT_LABELS,
	PRINT_LOCALE,
	type PrintLabels,
	utcDate,
} from "./print-labels";
import type { PrintOptions } from "./print-options-schema";
import type {
	PrintDay,
	PrintProgram,
	PrintSession,
	PrintSlot,
} from "./print-program-rules";

const SHEET_NAME_FORBIDDEN = /[[\]:*?/\\]/g;

const cellLength = (cell: XlsxCell) =>
	cell instanceof Date ? 10 : String(cell ?? "").length;

function widths(rows: XlsxCell[][], max = 60): number[] {
	const w: number[] = [];
	for (const row of rows)
		row.forEach((cell, c) => {
			w[c] = Math.max(w[c] ?? 6, cellLength(cell) + 2);
		});
	return w.map((x) => Math.min(max, x ?? 6));
}

type ColumnKey = keyof PrintLabels["columns"];
type ProgramRow = Partial<Record<ColumnKey, XlsxCell>>;

const PROGRAM_COLUMNS: ColumnKey[] = [
	"date",
	"weekday",
	"sessionCode",
	"sessionTitle",
	"sessionStart",
	"sessionEnd",
	"room",
	"track",
	"chairs",
	"type",
	"board",
	"start",
	"end",
	"title",
	"authors",
	"presenter",
	"badge",
	"submissionType",
	"invited",
	"submissionId",
];

function sessionPart(s: PrintSession) {
	return {
		sessionCode: s.code,
		sessionTitle: s.title,
		sessionStart: s.start,
		sessionEnd: s.end,
		room: s.room ?? "",
		track: s.track?.name ?? "",
		chairs: s.chairs.join(", "),
	} satisfies ProgramRow;
}

function slotPart(slot: PrintSlot, type: string) {
	return {
		type,
		board: slot.board ?? "",
		start: slot.start ?? "",
		end: slot.end ?? "",
		title: slot.title,
		authors: slot.authors.map((a) => a.fullName).join(", "),
		presenter: slot.authors.find((a) => a.presenting)?.fullName ?? "",
		badge: slot.badge ?? "",
		submissionType: slot.submissionType,
		invited: slot.invited,
		submissionId: slot.submissionNumber,
		cancelled: slot.cancelled,
	} satisfies ProgramRow;
}

function dayRows(
	day: PrintDay,
	l: PrintLabels,
	weekday: (d: Date) => string,
): { at: string; row: ProgramRow }[] {
	const date = utcDate(day.date);
	const base = { date, weekday: weekday(date) } satisfies ProgramRow;
	const sessionRows = day.sessions.flatMap((s) =>
		(s.slots.length > 0
			? s.slots.map((slot) => slotPart(slot, l.rowTypes.slot))
			: [{ type: l.rowTypes.session, start: s.start, end: s.end }]
		).map((part) => ({
			at: s.startAt,
			row: { ...base, ...sessionPart(s), ...part },
		})),
	);
	const itemRows = day.items.map((x) => ({
		at: x.startAt,
		row: {
			...base,
			room: x.place ?? "",
			type: l.rowTypes[x.kind],
			start: x.start,
			end: x.end,
			title: x.title,
		},
	}));
	return [...sessionRows, ...itemRows];
}

function programSheet(
	program: PrintProgram,
	options: PrintOptions,
	l: PrintLabels,
): XlsxSheetSpec {
	const weekdayFormat = new Intl.DateTimeFormat(
		PRINT_LOCALE[options.language],
		{
			timeZone: "UTC",
			weekday: "long",
		},
	);
	const weekday = (d: Date) =>
		capitalizeFirst(weekdayFormat.format(d), options.language);
	const columns: ColumnKey[] = options.includeCancelled
		? [...PROGRAM_COLUMNS, "cancelled"]
		: PROGRAM_COLUMNS;
	const body = program.days
		.flatMap((d) => dayRows(d, l, weekday))
		.toSorted(byAt)
		.map(({ row }) => columns.map((key) => row[key] ?? ""));
	const all = [columns.map((key) => l.columns[key]), ...body];
	return {
		name: l.sheets.program,
		rows: all,
		widths: widths(all),
		autofilter: true,
		headerRows: 1,
	};
}

function gridSheet(
	day: PrintDay,
	l: PrintLabels,
	short: Intl.DateTimeFormat,
	trackColor: boolean,
): XlsxSheetSpec {
	const grid = day.grid;
	const name = `D${day.index} ${short.format(utcDate(day.date))}`
		.replace(SHEET_NAME_FORBIDDEN, "")
		.slice(0, 31);
	const header: XlsxCell[] = [
		l.time,
		...grid.columns.map((col) => (col.lane === 1 ? col.room : null)),
	];
	const body: XlsxCell[][] = grid.rows.map((r) => [
		r,
		...grid.columns.map((): XlsxCell => null),
	]);
	const merges: XlsxSheetSpec["merges"] = [];
	const accents: XlsxSheetSpec["accents"] = [];
	grid.columns.forEach((col, i) => {
		if (col.lane === 1 && col.lanes > 1)
			merges.push({ s: { r: 0, c: i + 1 }, e: { r: 0, c: i + col.lanes } });
	});
	for (const cell of grid.cells) {
		const row = body[cell.row];
		if (row)
			row[cell.col + 1] = cell.code
				? `${cell.code} — ${cell.title}`
				: cell.title;
		if (trackColor && cell.trackColor && HEX_COLOR.test(cell.trackColor))
			accents.push({
				r: cell.row + 1,
				c: cell.col + 1,
				color: cell.trackColor,
			});
		if (cell.rowSpan > 1 || cell.colSpan > 1)
			merges.push({
				s: { r: cell.row + 1, c: cell.col + 1 },
				e: { r: cell.row + cell.rowSpan, c: cell.col + cell.colSpan },
			});
	}
	const rows = [header, ...body];
	return {
		name,
		rows,
		merges,
		accents,
		widths: widths(rows, 40),
		headerRows: 1,
		frozenColumns: 1,
		wrap: true,
	};
}

function authorsSheet(program: PrintProgram, l: PrintLabels): XlsxSheetSpec {
	const a = l.authorColumns;
	const rows: XlsxCell[][] = [
		[a.lastName, a.firstName, a.sessionCode, a.role, a.slotTitle],
		...program.appearances.map((p) => [
			p.lastName,
			p.firstName,
			p.code,
			l.roles[p.role],
			p.slotTitle ?? "",
		]),
	];
	return {
		name: l.sheets.authors,
		rows,
		widths: widths(rows),
		autofilter: true,
		headerRows: 1,
	};
}

function gridSheets(
	program: PrintProgram,
	options: PrintOptions,
	l: PrintLabels,
): XlsxSheetSpec[] {
	const short = new Intl.DateTimeFormat(PRINT_LOCALE[options.language], {
		timeZone: "UTC",
		weekday: "short",
		day: "numeric",
		month: "short",
	});
	return program.days.map((d) => gridSheet(d, l, short, options.trackColor));
}

export function buildXlsxSheets(
	program: PrintProgram,
	options: PrintOptions,
): XlsxSheetSpec[] {
	const l = PRINT_LABELS[options.language];
	return [
		...(options.parts.includes("detailed")
			? [programSheet(program, options, l)]
			: []),
		...(options.parts.includes("glance")
			? gridSheets(program, options, l)
			: []),
		...(options.parts.includes("index") ? [authorsSheet(program, l)] : []),
	];
}
