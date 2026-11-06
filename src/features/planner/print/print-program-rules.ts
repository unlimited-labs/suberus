import type {
	ScheduleItemKind,
	SubmissionType,
} from "@/generated/prisma/enums";
import { zonedDateString } from "@/shared/lib/zoned";
import { buildGrid, type DayGrid, type GridEntry } from "./print-grid-rules";
import {
	capitalizeFirst,
	PRINT_LABELS,
	PRINT_LOCALE,
	utcDate,
} from "./print-labels";
import type { PrintLanguage, PrintOptions } from "./print-options-schema";
import { assignSessionCodes } from "./session-code-rules";

export type ProgramOptions = Pick<
	PrintOptions,
	"language" | "includeCancelled"
>;

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
	timeLabel: string;
	start: string;
	end: string;
	room: string | null;
	track: { name: string; color: string | null } | null;
	chairs: string[];
	slots: PrintSlot[];
}

export interface PrintItem {
	kind: ScheduleItemKind;
	title: string;
	startAt: string;
	timeLabel: string;
	start: string;
	end: string;
	place: string | null;
	description: string | null;
}

export interface PrintDay {
	index: number;
	date: string;
	label: string;
	sessions: PrintSession[];
	items: PrintItem[];
	grid: DayGrid;
}

type AppearanceRole = "author" | "presenter" | "chair";

export interface Appearance {
	lastName: string;
	firstName: string;
	code: string;
	role: AppearanceRole;
	slotTitle: string | null;
}

interface IndexEntry {
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

interface Formatters {
	dayKey: (d: Date) => string;
	dayLabel: (d: Date) => string;
	time: (d: Date) => string;
}

function formatters(src: PrintSource, language: PrintLanguage): Formatters {
	const locale = PRINT_LOCALE[language];
	const tz = src.timeZone;
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
		dayKey: (d) => zonedDateString(d, tz),
		dayLabel: (d) => capitalizeFirst(label.format(d), language),
		time: (d) => time.format(d),
	};
}

const shortName = (p: { firstName: string | null; lastName: string | null }) =>
	[p.firstName ? `${p.firstName.charAt(0)}.` : "", p.lastName ?? ""]
		.filter(Boolean)
		.join(" ");

function datesLabel(src: PrintSource, language: PrintLanguage): string {
	if (!src.startDate) return "";
	const fmt = new Intl.DateTimeFormat(PRINT_LOCALE[language], {
		timeZone: "UTC",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
	return fmt.formatRange(
		utcDate(src.startDate),
		utcDate(src.endDate || src.startDate),
	);
}

export const byAt = (a: { at: string }, b: { at: string }) =>
	a.at < b.at ? -1 : a.at > b.at ? 1 : 0;

export function groupBy<T, K>(
	list: readonly T[],
	key: (item: T) => K,
): Map<K, T[]> {
	const groups = new Map<K, T[]>();
	for (const item of list) {
		const k = key(item);
		const group = groups.get(k) ?? [];
		group.push(item);
		groups.set(k, group);
	}
	return groups;
}

function isPresenting(slot: SourceSlot, a: SourceAuthor): boolean {
	return slot.submission.presenterId
		? a.id === slot.submission.presenterId
		: a.isPresenter;
}

function buildSlots(
	s: SourceSession,
	f: Formatters,
	options: ProgramOptions,
	badgeLabels: ReadonlyMap<string, string>,
): PrintSlot[] {
	let offsetMin = 0;
	return s.slots
		.toSorted((a, b) => a.order - b.order)
		.flatMap((slot, i): PrintSlot[] => {
			const startMin = offsetMin;
			offsetMin += slot.durationMin;
			if (slot.cancelled && !options.includeCancelled) return [];
			const start = s.untimedSlots
				? null
				: f.time(new Date(s.startAt.getTime() + startMin * 60_000));
			const end = s.untimedSlots
				? null
				: f.time(new Date(s.startAt.getTime() + offsetMin * 60_000));
			return [
				{
					id: slot.id,
					submissionNumber: slot.submission.sequentialNumber,
					submissionType: slot.submission.type,
					title: slot.submission.title,
					timeLabel: start && end ? `${start}–${end}` : null,
					start,
					end,
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
	options: ProgramOptions,
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
	options: ProgramOptions,
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
	options: ProgramOptions,
): PrintProgram {
	const f = formatters(src, options.language);
	const roomsById = new Map(src.rooms.map((r) => [r.id, r]));
	const badgeLabels = new Map(src.badges.map((b) => [b.id, b.label]));
	const labels = PRINT_LABELS[options.language];
	const collator = new Intl.Collator(PRINT_LOCALE[options.language]);
	const roomName = (id: string | null) =>
		(id ? roomsById.get(id)?.name : undefined) ?? labels.noRoom;
	const roomOrder = (id: string | null) =>
		(id ? roomRank.get(id) : undefined) ?? Number.MAX_SAFE_INTEGER;
	const roomRank = new Map(
		src.rooms
			.toSorted((a, b) => a.order - b.order || a.name.localeCompare(b.name))
			.map((r, i) => [r.id, i]),
	);

	const keyOf = new Map(
		[...src.sessions, ...src.items].map((x) => [x, f.dayKey(x.startAt)]),
	);
	const dayKeys = [...new Set(keyOf.values())].toSorted();
	const dayIndex = new Map(dayKeys.map((k, i) => [k, i + 1]));

	const codes = assignSessionCodes(
		src.sessions.map((s) => ({
			id: s.id,
			dayIndex: dayIndex.get(keyOf.get(s) ?? "") ?? 0,
			roomId: s.roomId,
			startAt: s.startAt,
		})),
		roomRank,
	);

	const sessions = src.sessions.toSorted(
		(a, b) =>
			a.startAt.getTime() - b.startAt.getTime() ||
			roomOrder(a.roomId) - roomOrder(b.roomId),
	);

	const people = buildAuthorIndex(sessions, codes, options, collator);
	const items = src.items.toSorted(
		(a, b) => a.startAt.getTime() - b.startAt.getTime(),
	);

	const sessionsByDay = groupBy(sessions, (s) => keyOf.get(s) ?? "");
	const itemsByDay = groupBy(items, (x) => keyOf.get(x) ?? "");
	const days = dayKeys.map((key, i) => {
		const daySessions = sessionsByDay.get(key) ?? [];
		const dayItems = itemsByDay.get(key) ?? [];
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
		const first = daySessions[0]?.startAt ?? dayItems[0]?.startAt;
		return {
			index: i + 1,
			date: key,
			label: first ? f.dayLabel(first) : key,
			sessions: daySessions.map((s): PrintSession => {
				const start = f.time(s.startAt);
				const end = f.time(s.endAt);
				return {
					id: s.id,
					code: codes.get(s.id) ?? "",
					title: s.title,
					startAt: s.startAt.toISOString(),
					timeLabel: `${start}–${end}`,
					start,
					end,
					room: s.roomId ? (roomsById.get(s.roomId)?.name ?? null) : null,
					track: s.track,
					chairs: s.chairs.map(shortName),
					slots: buildSlots(s, f, options, badgeLabels),
				};
			}),
			items: dayItems.map((x): PrintItem => {
				const start = f.time(x.startAt);
				const end = f.time(x.endAt);
				return {
					kind: x.kind,
					title: x.title,
					startAt: x.startAt.toISOString(),
					timeLabel: `${start}–${end}`,
					start,
					end,
					place: x.location ?? (x.roomId ? roomName(x.roomId) : null),
					description: x.kind === "EVENT" ? x.description : null,
				};
			}),
			grid: buildGrid(entries, f.time, roomName, roomOrder),
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
