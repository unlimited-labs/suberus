import { slotStartAt } from "@/features/planner/server/slot-timing";
import type {
	ScheduleItemKind,
	SubmissionType,
} from "@/generated/prisma/enums";
import { PRINT_LABELS } from "./print-labels";
import type { PrintLanguage, PrintOptions } from "./print-options-schema";
import { assignSessionCodes } from "./session-code-rules";

export interface SourceRoom {
	id: string;
	name: string;
	order: number;
}

export interface SourcePerson {
	userId: string | null;
	email: string;
	firstName: string | null;
	lastName: string | null;
}

export interface SourceAuthor extends SourcePerson {
	id: string;
	firstName: string;
	lastName: string;
	orderIndex: number;
	isPresenter: boolean;
}

export interface SourceSlot {
	id: string;
	order: number;
	durationMin: number;
	cancelled: boolean;
	badgeId: string | null;
	submission: {
		id: string;
		sequentialNumber: number;
		title: string;
		type: SubmissionType;
		presenterId: string | null;
		authors: SourceAuthor[];
	};
}

export interface SourceSession {
	id: string;
	title: string;
	startAt: Date;
	endAt: Date;
	untimedSlots: boolean;
	roomId: string | null;
	track: { name: string; color: string | null } | null;
	chairs: SourcePerson[];
	slots: SourceSlot[];
}

export interface SourceItem {
	id: string;
	kind: ScheduleItemKind;
	title: string;
	description: string | null;
	location: string | null;
	roomId: string | null;
	startAt: Date;
	endAt: Date;
}

export interface PrintSource {
	conferenceName: string;
	startDate: string;
	endDate: string;
	timeZone: string;
	timeFormat: "24h" | "12h";
	draft: boolean;
	rooms: SourceRoom[];
	badges: { id: string; label: string }[];
	sessions: SourceSession[];
	items: SourceItem[];
}

export interface PrintSlot {
	id: string;
	submissionId: string;
	submissionNumber: number;
	submissionType: SubmissionType;
	title: string;
	timeLabel: string | null;
	start: string | null;
	end: string | null;
	board: string | null;
	authors: { name: string; fullName: string; presenting: boolean }[];
	badge: string | null;
	invited: boolean;
	cancelled: boolean;
}

export interface PrintSession {
	id: string;
	code: string;
	title: string;
	startAt: string;
	endAt: string;
	timeLabel: string;
	start: string;
	end: string;
	room: string | null;
	track: { name: string; color: string | null } | null;
	chairs: string[];
	untimed: boolean;
	slots: PrintSlot[];
}

export interface PrintItem {
	id: string;
	kind: ScheduleItemKind;
	title: string;
	startAt: string;
	timeLabel: string;
	start: string;
	end: string;
	place: string | null;
	description: string | null;
}

export interface GridColumn {
	room: string;
	lane: number;
	lanes: number;
}

export interface GridCell {
	row: number;
	col: number;
	rowSpan: number;
	colSpan: number;
	band: boolean;
	code: string | null;
	title: string;
	trackColor: string | null;
}

export interface DayGrid {
	columns: GridColumn[];
	rows: { start: string; end: string }[];
	cells: GridCell[];
}

export interface PrintDay {
	index: number;
	date: string;
	label: string;
	sessions: PrintSession[];
	items: PrintItem[];
	grid: DayGrid;
}

export type AppearanceRole = "author" | "presenter" | "chair";

export interface Appearance {
	lastName: string;
	firstName: string;
	code: string;
	role: AppearanceRole;
	slotTitle: string | null;
}

export interface IndexEntry {
	name: string;
	refs: { code: string; presenting: boolean }[];
}

export interface PrintProgram {
	conferenceName: string;
	datesLabel: string;
	draft: boolean;
	days: PrintDay[];
	authorIndex: IndexEntry[];
	appearances: Appearance[];
	tracks: { name: string; color: string | null }[];
}

const LOCALE = { en: "en-GB", pl: "pl-PL" } satisfies Record<
	PrintLanguage,
	string
>;

interface Formatters {
	dayKey: (d: Date) => string;
	dayLabel: (d: Date) => string;
	time: (d: Date) => string;
}

function formatters(src: PrintSource, language: PrintLanguage): Formatters {
	const locale = LOCALE[language];
	const tz = src.timeZone;
	const key = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		dateStyle: "short",
	});
	const label = new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		weekday: "long",
		day: "numeric",
		month: "long",
	});
	const time = new Intl.DateTimeFormat(locale, {
		timeZone: tz,
		hour: src.timeFormat === "24h" ? "2-digit" : "numeric",
		minute: "2-digit",
		hourCycle: src.timeFormat === "24h" ? "h23" : "h12",
	});
	return {
		dayKey: (d) => key.format(d),
		dayLabel: (d) => {
			const text = label.format(d);
			return text.charAt(0).toLocaleUpperCase(LOCALE[language]) + text.slice(1);
		},
		time: (d) => time.format(d),
	};
}

export const shortName = (p: {
	firstName: string | null;
	lastName: string | null;
}) =>
	[p.firstName ? `${p.firstName.charAt(0)}.` : "", p.lastName ?? ""]
		.filter(Boolean)
		.join(" ");

function datesLabel(src: PrintSource, language: PrintLanguage): string {
	if (!src.startDate) return "";
	const toUtc = (iso: string) => new Date(`${iso}T00:00:00Z`);
	const fmt = new Intl.DateTimeFormat(LOCALE[language], {
		timeZone: "UTC",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	return fmt.formatRange(
		toUtc(src.startDate),
		toUtc(src.endDate || src.startDate),
	);
}

interface GridEntry {
	start: number;
	end: number;
	roomId: string | null;
	band: boolean;
	code: string | null;
	title: string;
	trackColor: string | null;
}

const overlaps = (a: GridEntry, b: GridEntry) =>
	a.start < b.end && a.end > b.start;

function assignLanes(
	entries: GridEntry[],
	roomOrder: (id: string | null) => number,
) {
	const byRoom = new Map<string | null, GridEntry[]>();
	for (const e of entries)
		byRoom.set(e.roomId, [...(byRoom.get(e.roomId) ?? []), e]);
	const rooms = [...byRoom.keys()].toSorted(
		(a, b) => roomOrder(a) - roomOrder(b),
	);
	const laneOf = new Map<GridEntry, { roomId: string | null; lane: number }>();
	const laneCount = new Map<string | null, number>();
	for (const roomId of rooms) {
		const laneEnds: number[] = [];
		for (const e of (byRoom.get(roomId) ?? []).toSorted(
			(a, b) => a.start - b.start,
		)) {
			const free = laneEnds.findIndex((end) => end <= e.start);
			const lane = free === -1 ? laneEnds.length : free;
			laneEnds[lane] = e.end;
			laneOf.set(e, { roomId, lane: lane + 1 });
		}
		laneCount.set(roomId, laneEnds.length);
	}
	return { rooms, laneOf, laneCount };
}

function buildGrid(
	entries: GridEntry[],
	f: Formatters,
	roomName: (id: string | null) => string,
	roomOrder: (id: string | null) => number,
): DayGrid {
	const sessionsOnly = entries.filter((e) => !e.band);
	const marked = entries.map((e) =>
		e.band
			? e
			: { ...e, band: !sessionsOnly.some((o) => o !== e && overlaps(o, e)) },
	);
	const { rooms, laneOf, laneCount } = assignLanes(
		marked.filter((e) => !e.band),
		roomOrder,
	);
	const columns = rooms.flatMap((roomId) =>
		Array.from({ length: laneCount.get(roomId) ?? 0 }, (_, i) => ({
			room: roomName(roomId),
			lane: i + 1,
			lanes: laneCount.get(roomId) ?? 0,
		})),
	);
	const colOf = (roomId: string | null, lane: number) =>
		rooms
			.slice(0, rooms.indexOf(roomId))
			.reduce((n, r) => n + (laneCount.get(r) ?? 0), 0) +
		lane -
		1;

	const bounds = [...new Set(marked.flatMap((e) => [e.start, e.end]))].toSorted(
		(a, b) => a - b,
	);
	const rows = bounds
		.slice(0, -1)
		.map((start, i) => ({ start, end: bounds[i + 1] ?? start }))
		.filter((r) => marked.some((e) => e.start <= r.start && e.end >= r.end));

	const cells = marked
		.map((e): GridCell => {
			const lane = laneOf.get(e);
			return {
				row: rows.findIndex((r) => r.start === e.start),
				col: e.band || !lane ? 0 : colOf(lane.roomId, lane.lane),
				rowSpan: rows.filter((r) => r.start >= e.start && r.end <= e.end)
					.length,
				colSpan: e.band ? Math.max(1, columns.length) : 1,
				band: e.band,
				code: e.code,
				title: e.title,
				trackColor: e.trackColor,
			};
		})
		.toSorted((a, b) => a.row - b.row || a.col - b.col);

	return {
		columns,
		rows: rows.map((r) => ({
			start: f.time(new Date(r.start)),
			end: f.time(new Date(r.end)),
		})),
		cells,
	};
}

function isPresenting(slot: SourceSlot, a: SourceAuthor): boolean {
	return slot.submission.presenterId
		? a.id === slot.submission.presenterId
		: a.isPresenter;
}

function buildSlots(
	s: SourceSession,
	f: Formatters,
	options: PrintOptions,
	badgeLabels: ReadonlyMap<string, string>,
): PrintSlot[] {
	const all = s.slots.toSorted((a, b) => a.order - b.order);
	return all.flatMap((slot, i): PrintSlot[] => {
		if (slot.cancelled && !options.includeCancelled) return [];
		const start = slotStartAt(s.startAt, all, slot.order);
		const end = new Date(start.getTime() + slot.durationMin * 60_000);
		return [
			{
				id: slot.id,
				submissionId: slot.submission.id,
				submissionNumber: slot.submission.sequentialNumber,
				submissionType: slot.submission.type,
				title: slot.submission.title,
				timeLabel: s.untimedSlots ? null : `${f.time(start)}–${f.time(end)}`,
				start: s.untimedSlots ? null : f.time(start),
				end: s.untimedSlots ? null : f.time(end),
				board: s.untimedSlots ? `P${i + 1}` : null,
				authors: slot.submission.authors
					.toSorted((a, b) => a.orderIndex - b.orderIndex)
					.map((a) => ({
						name: shortName(a),
						fullName: `${a.firstName} ${a.lastName}`,
						presenting: isPresenting(slot, a),
					})),
				badge: slot.badgeId ? (badgeLabels.get(slot.badgeId) ?? null) : null,
				invited: slot.submission.type === "INVITED",
				cancelled: slot.cancelled,
			},
		];
	});
}

interface KeyedAppearance extends Appearance {
	key: string;
	indexName: string;
}

function appearanceOf(
	p: SourcePerson,
	code: string,
	role: AppearanceRole,
	slotTitle: string | null,
): KeyedAppearance {
	return {
		key: p.userId ?? p.email.toLowerCase(),
		indexName: [p.lastName, p.firstName].filter(Boolean).join(", ") || p.email,
		lastName: p.lastName ?? "",
		firstName: p.firstName ?? "",
		code,
		role,
		slotTitle,
	};
}

function sessionAppearances(
	s: SourceSession,
	code: string,
	options: PrintOptions,
): KeyedAppearance[] {
	const slots = s.slots
		.filter((slot) => options.includeCancelled || !slot.cancelled)
		.toSorted((a, b) => a.order - b.order);
	return [
		...s.chairs.map((chair) => appearanceOf(chair, code, "chair", null)),
		...slots.flatMap((slot) =>
			slot.submission.authors
				.toSorted((x, y) => x.orderIndex - y.orderIndex)
				.map((a) =>
					appearanceOf(
						a,
						code,
						isPresenting(slot, a) ? "presenter" : "author",
						slot.submission.title,
					),
				),
		),
	];
}

function buildAuthorIndex(
	sessions: readonly SourceSession[],
	codes: ReadonlyMap<string, string>,
	options: PrintOptions,
	collator: Intl.Collator,
): Pick<PrintProgram, "authorIndex" | "appearances"> {
	const keyed = sessions.flatMap((s) =>
		sessionAppearances(s, codes.get(s.id) ?? "", options),
	);
	const people = new Map<
		string,
		{ name: string; refs: Map<string, boolean> }
	>();
	for (const a of keyed) {
		const entry = people.get(a.key) ?? {
			name: a.indexName,
			refs: new Map<string, boolean>(),
		};
		entry.refs.set(
			a.code,
			(entry.refs.get(a.code) ?? false) || a.role === "presenter",
		);
		people.set(a.key, entry);
	}
	const authorIndex = [...people.values()]
		.map((e) => ({
			name: e.name,
			refs: [...e.refs].map(([code, presenting]) => ({ code, presenting })),
		}))
		.toSorted((a, b) => collator.compare(a.name, b.name));
	const appearances = keyed.map(({ key: _key, indexName: _name, ...a }) => a);
	return { authorIndex, appearances };
}

export function buildPrintProgram(
	src: PrintSource,
	options: PrintOptions,
): PrintProgram {
	const f = formatters(src, options.language);
	const roomsById = new Map(src.rooms.map((r) => [r.id, r]));
	const badgeLabels = new Map(src.badges.map((b) => [b.id, b.label]));
	const labels = PRINT_LABELS[options.language];
	const collator = new Intl.Collator(LOCALE[options.language]);
	const roomName = (id: string | null) =>
		(id ? roomsById.get(id)?.name : undefined) ?? labels.noRoom;
	const roomOrder = (id: string | null) =>
		(id ? roomRank.get(id) : undefined) ?? Number.MAX_SAFE_INTEGER;
	const roomRank = new Map(
		src.rooms
			.toSorted((a, b) => a.order - b.order || a.name.localeCompare(b.name))
			.map((r, i) => [r.id, i]),
	);

	const dayKeys = [
		...new Set([...src.sessions, ...src.items].map((x) => f.dayKey(x.startAt))),
	].toSorted();
	const dayIndex = new Map(dayKeys.map((k, i) => [k, i + 1]));
	const indexOf = (d: Date) => dayIndex.get(f.dayKey(d)) ?? 0;

	const codes = assignSessionCodes(
		src.sessions.map((s) => ({
			id: s.id,
			dayIndex: indexOf(s.startAt),
			roomId: s.roomId,
			startAt: s.startAt,
		})),
		roomRank,
	);

	const sessions = src.sessions.toSorted(
		(a, b) =>
			a.startAt.getTime() - b.startAt.getTime() ||
			(roomRank.get(a.roomId ?? "") ?? Number.MAX_SAFE_INTEGER) -
				(roomRank.get(b.roomId ?? "") ?? Number.MAX_SAFE_INTEGER),
	);

	const people = buildAuthorIndex(sessions, codes, options, collator);
	const items = src.items.toSorted(
		(a, b) => a.startAt.getTime() - b.startAt.getTime(),
	);

	const days = dayKeys.map((key, i) => {
		const daySessions = sessions.filter((s) => f.dayKey(s.startAt) === key);
		const dayItems = items.filter((x) => f.dayKey(x.startAt) === key);
		const entries: GridEntry[] = [
			...daySessions.map((s) => ({
				start: s.startAt.getTime(),
				end: s.endAt.getTime(),
				roomId: s.roomId,
				band: false,
				code: codes.get(s.id) ?? null,
				title: s.title,
				trackColor: s.track?.color ?? null,
			})),
			...dayItems.map((x) => ({
				start: x.startAt.getTime(),
				end: x.endAt.getTime(),
				roomId: x.roomId,
				band: !daySessions.some(
					(s) => s.startAt < x.endAt && s.endAt > x.startAt,
				),
				code: null,
				title: x.title,
				trackColor: null,
			})),
		];
		const first =
			daySessions[0]?.startAt ??
			src.items.find((x) => f.dayKey(x.startAt) === key)?.startAt;
		return {
			index: i + 1,
			date: key,
			label: first ? f.dayLabel(first) : key,
			sessions: daySessions.map((s): PrintSession => ({
				id: s.id,
				code: codes.get(s.id) ?? "",
				title: s.title,
				startAt: s.startAt.toISOString(),
				endAt: s.endAt.toISOString(),
				timeLabel: `${f.time(s.startAt)}–${f.time(s.endAt)}`,
				start: f.time(s.startAt),
				end: f.time(s.endAt),
				room: s.roomId ? (roomsById.get(s.roomId)?.name ?? null) : null,
				track: s.track,
				chairs: s.chairs.map(shortName),
				untimed: s.untimedSlots,
				slots: buildSlots(s, f, options, badgeLabels),
			})),
			items: dayItems.map((x): PrintItem => ({
				id: x.id,
				kind: x.kind,
				title: x.title,
				startAt: x.startAt.toISOString(),
				timeLabel: `${f.time(x.startAt)}–${f.time(x.endAt)}`,
				start: f.time(x.startAt),
				end: f.time(x.endAt),
				place: x.location ?? (x.roomId ? roomName(x.roomId) : null),
				description: x.kind === "EVENT" ? x.description : null,
			})),
			grid: buildGrid(entries, f, roomName, roomOrder),
		};
	});

	return {
		conferenceName: src.conferenceName,
		datesLabel: datesLabel(src, options.language),
		draft: src.draft,
		days,
		...people,
		tracks: [
			...new Map(
				sessions.flatMap((x) => (x.track ? [[x.track.name, x.track]] : [])),
			).values(),
		].toSorted((a, b) => collator.compare(a.name, b.name)),
	};
}
