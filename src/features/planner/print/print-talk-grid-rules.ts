import { groupBy } from "./print-grid-rules";
import { timeRange } from "./print-labels";
import type { PrintItem, PrintSession, PrintSlot } from "./print-program-rules";

export type TalkRow =
	| { kind: "head" }
	| { kind: "chairs" }
	| { kind: "time"; label: string };

export type TalkCellContent =
	| { kind: "head"; session: PrintSession }
	| { kind: "chairs"; session: PrintSession }
	| { kind: "talk"; slot: PrintSlot }
	| { kind: "empty" };

export interface TalkCell {
	row: number;
	col: number;
	rowSpan: number;
	content: TalkCellContent;
}

export type TalkBlock =
	| {
			kind: "talks";
			label: string;
			plenary: PrintSession | null;
			aligned: boolean;
			rows: TalkRow[];
			columns: number;
			cells: TalkCell[];
	  }
	| { kind: "posters"; session: PrintSession }
	| { kind: "item"; item: PrintItem };

export interface PlacedSession {
	session: PrintSession;
	room: string | null;
	roomRank: number;
}

const ms = (iso: string) => Date.parse(iso);

const isPosterSession = (s: PrintSession) =>
	s.slots.some((slot) => slot.startAt === null);

function overlapClusters(sessions: readonly PlacedSession[]) {
	const clusters: { end: number; members: PlacedSession[] }[] = [];
	for (const p of sessions.toSorted(
		(a, b) => ms(a.session.startAt) - ms(b.session.startAt),
	)) {
		const last = clusters.at(-1);
		if (last && ms(p.session.startAt) < last.end) {
			last.members.push(p);
			last.end = Math.max(last.end, ms(p.session.endAt));
		} else clusters.push({ end: ms(p.session.endAt), members: [p] });
	}
	return clusters.map((c) => c.members);
}

function columnsOf(members: readonly PlacedSession[]) {
	const byRoom = groupBy(members, (p) => p.room);
	const rooms = [...byRoom.values()].toSorted(
		(a, b) => (a[0]?.roomRank ?? 0) - (b[0]?.roomRank ?? 0),
	);
	return rooms.flatMap((inRoom) => {
		const lanes: PlacedSession[][] = [];
		for (const p of inRoom.toSorted(
			(a, b) => ms(a.session.startAt) - ms(b.session.startAt),
		)) {
			const free = lanes.find(
				(lane) => ms(lane.at(-1)?.session.endAt ?? "") <= ms(p.session.startAt),
			);
			if (free) free.push(p);
			else lanes.push([p]);
		}
		return lanes.map((lane) => lane.map((p) => p.session));
	});
}

const timedSlots = (s: PrintSession) =>
	s.slots.flatMap((slot) =>
		slot.startAt && slot.endAt
			? [{ slot, start: ms(slot.startAt), end: ms(slot.endAt) }]
			: [],
	);

function talksBlock(
	members: readonly PlacedSession[],
	time: (d: Date) => string,
): TalkBlock {
	const sessions = members
		.map((p) => p.session)
		.toSorted((a, b) => ms(a.startAt) - ms(b.startAt));
	const talks = sessions.flatMap(timedSlots);
	const bounds = [...new Set(talks.flatMap((x) => [x.start, x.end]))].toSorted(
		(a, b) => a - b,
	);
	const intervals = bounds
		.slice(0, -1)
		.map((start, i) => ({ start, end: bounds[i + 1] ?? start }))
		.filter((r) => talks.some((x) => x.start <= r.start && x.end >= r.end));

	const rows: TalkRow[] = [];
	const headRow = new Map<PrintSession, number>();
	const chairsRow = new Map<PrintSession, number>();
	const startRow = new Map<number, number>();
	const endRow = new Map<number, number>();
	let headed = 0;
	const headSessionsUpTo = (at: number) => {
		const starting = sessions.slice(headed).filter((s) => ms(s.startAt) <= at);
		headed += starting.length;
		if (starting.length === 0) return;
		for (const s of starting) headRow.set(s, rows.length);
		rows.push({ kind: "head" });
		if (!starting.some((s) => s.chairNames.length > 0)) return;
		for (const s of starting) chairsRow.set(s, rows.length);
		rows.push({ kind: "chairs" });
	};
	for (const r of intervals) {
		headSessionsUpTo(r.start);
		startRow.set(r.start, rows.length);
		endRow.set(r.end, rows.length);
		rows.push({
			kind: "time",
			label: timeRange(time(new Date(r.start)), time(new Date(r.end))),
		});
	}
	headSessionsUpTo(Number.POSITIVE_INFINITY);

	const columns = columnsOf(members);
	const cells = columns.flatMap((lane, col) => {
		const placed: TalkCell[] = lane.flatMap((s) => {
			const head = headRow.get(s) ?? 0;
			const chairs = chairsRow.get(s);
			return [
				{ row: head, col, rowSpan: 1, content: { kind: "head", session: s } },
				...(chairs === undefined
					? []
					: [
							{
								row: chairs,
								col,
								rowSpan: 1,
								content: { kind: "chairs", session: s },
							} satisfies TalkCell,
						]),
				...timedSlots(s).map(({ slot, start, end }) => {
					const row = startRow.get(start) ?? 0;
					return {
						row,
						col,
						rowSpan: (endRow.get(end) ?? row) - row + 1,
						content: { kind: "talk", slot },
					} satisfies TalkCell;
				}),
			];
		});
		const taken = new Set(
			placed.flatMap((c) =>
				Array.from({ length: c.rowSpan }, (_, i) => c.row + i),
			),
		);
		const empties: TalkCell[] = [];
		rows.forEach((_, row) => {
			if (taken.has(row)) return;
			const prev = empties.at(-1);
			if (prev && prev.row + prev.rowSpan === row) prev.rowSpan++;
			else empties.push({ row, col, rowSpan: 1, content: { kind: "empty" } });
		});
		return [...placed, ...empties];
	});

	const start = Math.min(...sessions.map((s) => ms(s.startAt)));
	const end = Math.max(...sessions.map((s) => ms(s.endAt)));
	return {
		kind: "talks",
		label: timeRange(time(new Date(start)), time(new Date(end))),
		plenary: sessions.length === 1 ? (sessions[0] ?? null) : null,
		aligned: cells.every((c) => c.content.kind !== "talk" || c.rowSpan === 1),
		rows,
		columns: columns.length,
		cells: cells.toSorted((a, b) => a.row - b.row || a.col - b.col),
	};
}

export function buildTalkBlocks(
	sessions: readonly PlacedSession[],
	items: readonly PrintItem[],
	time: (d: Date) => string,
): TalkBlock[] {
	const posters = sessions.filter((p) => isPosterSession(p.session));
	const timed = sessions.filter((p) => !isPosterSession(p.session));
	const blocks = [
		...overlapClusters(timed).map((members) => ({
			at: Math.min(...members.map((p) => ms(p.session.startAt))),
			block: talksBlock(members, time),
		})),
		...posters.map((p) => ({
			at: ms(p.session.startAt),
			block: { kind: "posters", session: p.session } satisfies TalkBlock,
		})),
		...items.map((item) => ({
			at: ms(item.startAt),
			block: { kind: "item", item } satisfies TalkBlock,
		})),
	];
	return blocks.toSorted((a, b) => a.at - b.at).map((b) => b.block);
}
