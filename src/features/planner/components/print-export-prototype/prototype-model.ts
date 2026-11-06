// PROTOTYPE (throwaway, wayfinder "Export page: options and live preview"): crude stand-in
// for the real PrintProgram/PrintDocument builders. Never merge.
import type { ProgramSessionDetail } from "@/features/planner/server/sessions";

export type ExportFormat = "xlsx" | "docx" | "idml";
export type BookSize = "A4" | "A5" | "B5";
export type Layout = "columns" | "spread" | "transposed" | "list";
export type LayoutOverride = "auto" | Layout;
export type Language = "en" | "pl";

export interface PrintOptions {
	bookSize: BookSize;
	trackColor: boolean;
	layoutOverride: LayoutOverride;
	includeCancelled: boolean;
	language: Language;
}

export const DEFAULT_OPTIONS: PrintOptions = {
	bookSize: "A4",
	trackColor: true,
	layoutOverride: "auto",
	includeCancelled: false,
	language: "en",
};

export const FORMATS: ReadonlyArray<{
	value: ExportFormat;
	label: string;
	ext: string;
	hint: string;
}> = [
	{
		value: "docx",
		label: "Word",
		ext: "docx",
		hint: "Ready booklet, lightly editable",
	},
	{
		value: "idml",
		label: "InDesign",
		ext: "idml",
		hint: "Handoff to a designer",
	},
	{
		value: "xlsx",
		label: "Excel",
		ext: "xlsx",
		hint: "Raw data, one sheet per day",
	},
];

export const BOOK_SIZES: ReadonlyArray<{ value: BookSize; label: string }> = [
	{ value: "A4", label: "A4" },
	{ value: "B5", label: "B5" },
	{ value: "A5", label: "A5" },
];

export const LAYOUTS: ReadonlyArray<{ value: LayoutOverride; label: string }> =
	[
		{ value: "auto", label: "Auto" },
		{ value: "columns", label: "Rooms as columns" },
		{ value: "spread", label: "Spread" },
		{ value: "transposed", label: "Transposed" },
		{ value: "list", label: "List" },
	];

export const LANGUAGES: ReadonlyArray<{ value: Language; label: string }> = [
	{ value: "en", label: "English" },
	{ value: "pl", label: "Polski" },
];

export const PAGE_MM = {
	A4: [210, 297],
	B5: [176, 250],
	A5: [148, 210],
} satisfies Record<BookSize, [number, number]>;

export function appliesToFormat(
	format: ExportFormat,
	key: keyof PrintOptions,
): boolean {
	return format !== "xlsx" || key === "includeCancelled" || key === "language";
}

export interface DayBreak {
	id: string;
	title: string;
	startAt: Date;
	endAt: Date;
}

export interface PreviewSession {
	code: string;
	session: ProgramSessionDetail;
}

export interface PreviewDay {
	index: number;
	label: string;
	rooms: string[];
	sessions: PreviewSession[];
	breaks: DayBreak[];
	autoLayout: Layout;
	layout: Layout;
	landscape: boolean;
}

export function autoLayoutFor(roomCount: number): Layout {
	if (roomCount <= 8) return "columns";
	if (roomCount <= 14) return "spread";
	return "transposed";
}

const ROOM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWYZ";

export function buildDays(
	sessions: ProgramSessionDetail[],
	breaks: DayBreak[],
	roomOrder: string[],
	tz: string,
	options: PrintOptions,
): PreviewDay[] {
	const locale = options.language === "pl" ? "pl-PL" : "en-GB";
	const dayKey = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		dateStyle: "short",
	});
	const dayLabel = new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		weekday: "long",
		day: "numeric",
		month: "long",
	});
	const byDay = new Map<
		string,
		{ label: string; sessions: ProgramSessionDetail[]; breaks: DayBreak[] }
	>();
	const bucket = (d: Date) => {
		const key = dayKey.format(d);
		const existing = byDay.get(key);
		if (existing) return existing;
		const created = {
			label: dayLabel.format(d),
			sessions: [],
			breaks: [],
		};
		byDay.set(key, created);
		return created;
	};
	for (const s of sessions) bucket(s.startAt).sessions.push(s);
	for (const b of breaks) bucket(b.startAt).breaks.push(b);

	return [...byDay.keys()].toSorted().map((key, i) => {
		const day = byDay.get(key) ?? { label: key, sessions: [], breaks: [] };
		const roomIds = [
			...new Set(day.sessions.map((s) => s.room?.name ?? "—")),
		].toSorted((a, b) => roomOrder.indexOf(a) - roomOrder.indexOf(b));
		const nth = new Map<string, number>();
		const coded = day.sessions
			.toSorted((a, b) => a.startAt.getTime() - b.startAt.getTime())
			.map((session) => {
				const room = session.room?.name;
				const letter = room
					? (ROOM_LETTERS[roomOrder.indexOf(room)] ?? "?")
					: "X";
				const n = (nth.get(letter) ?? 0) + 1;
				nth.set(letter, n);
				return { code: `${i + 1}${letter}${n}`, session };
			});
		const autoLayout = autoLayoutFor(roomIds.length);
		const layout =
			options.layoutOverride === "auto" ? autoLayout : options.layoutOverride;
		const landscapeFrom = options.bookSize === "A4" ? 5 : 4;
		return {
			index: i + 1,
			label: day.label,
			rooms: roomIds,
			sessions: coded,
			breaks: day.breaks,
			autoLayout,
			layout,
			landscape: layout === "columns" && roomIds.length >= landscapeFrom,
		};
	});
}

export interface IndexEntry {
	name: string;
	codes: string[];
}

export function buildAuthorIndex(
	days: PreviewDay[],
	language: Language,
): IndexEntry[] {
	const map = new Map<string, Set<string>>();
	for (const day of days) {
		for (const { code, session } of day.sessions) {
			for (const p of session.presentations) {
				for (const a of p.authors) {
					const name = `${a.lastName}, ${a.firstName}`;
					const set = map.get(name) ?? new Set<string>();
					set.add(code);
					map.set(name, set);
				}
			}
		}
	}
	const collator = new Intl.Collator(language === "pl" ? "pl" : "en");
	return [...map.entries()]
		.map(([name, codes]) => ({ name, codes: [...codes] }))
		.toSorted((a, b) => collator.compare(a.name, b.name));
}

export function formatTime(d: Date, tz: string): string {
	return new Intl.DateTimeFormat("en-GB", {
		timeZone: tz,
		hour: "2-digit",
		minute: "2-digit",
	}).format(d);
}

export const LABELS = {
	en: {
		glance: "Program at a glance",
		detailed: "Detailed program",
		index: "Author index",
		contents: "Contents",
		chair: "Chair",
		room: "Room",
		time: "Time",
	},
	pl: {
		glance: "Program w skrócie",
		detailed: "Program szczegółowy",
		index: "Indeks autorów",
		contents: "Spis treści",
		chair: "Prowadzący",
		room: "Sala",
		time: "Godz.",
	},
} satisfies Record<Language, Record<string, string>>;
