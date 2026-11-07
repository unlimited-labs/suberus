import { timeRange } from "./print-labels";

interface GridColumn {
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
	rows: string[];
	cells: GridCell[];
}

export interface GridEntry {
	start: number;
	end: number;
	roomId: string | null;
	code: string | null;
	title: string;
	trackColor: string | null;
}

const overlaps = (a: GridEntry, b: GridEntry) =>
	a.start < b.end && a.end > b.start;

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

function assignLanes(
	entries: GridEntry[],
	roomOrder: (id: string | null) => number,
) {
	const byRoom = groupBy(entries, (e) => e.roomId);
	const rooms = [...byRoom.keys()].toSorted(
		(a, b) => roomOrder(a) - roomOrder(b),
	);
	const columnOf = new Map<GridEntry, number>();
	const laneCount = new Map<string | null, number>();
	let next = 0;
	for (const roomId of rooms) {
		const laneEnds: number[] = [];
		for (const e of (byRoom.get(roomId) ?? []).toSorted(
			(a, b) => a.start - b.start,
		)) {
			const free = laneEnds.findIndex((end) => end <= e.start);
			const lane = free === -1 ? laneEnds.length : free;
			laneEnds[lane] = e.end;
			columnOf.set(e, next + lane);
		}
		laneCount.set(roomId, laneEnds.length);
		next += laneEnds.length;
	}
	return { rooms, columnOf, laneCount };
}

export function buildGrid(
	entries: GridEntry[],
	time: (d: Date) => string,
	roomName: (id: string | null) => string,
	roomOrder: (id: string | null) => number,
): DayGrid {
	const marked = entries.map((e) => ({
		...e,
		band: !entries.some((o) => o !== e && overlaps(o, e)),
	}));
	const { rooms, columnOf, laneCount } = assignLanes(
		marked.filter((e) => !e.band),
		roomOrder,
	);
	const laneColumns = rooms.flatMap((roomId) => {
		const lanes = laneCount.get(roomId) ?? 0;
		return Array.from({ length: lanes }, (_, i) => ({
			room: roomName(roomId),
			lane: i + 1,
			lanes,
		}));
	});
	const columns =
		laneColumns.length > 0 ? laneColumns : [{ room: "", lane: 1, lanes: 1 }];

	const bounds = [...new Set(marked.flatMap((e) => [e.start, e.end]))].toSorted(
		(a, b) => a - b,
	);
	const rows = bounds
		.slice(0, -1)
		.map((start, i) => ({ start, end: bounds[i + 1] ?? start }))
		.filter((r) => marked.some((e) => e.start <= r.start && e.end >= r.end));
	const rowIndex = new Map(rows.map((r, i) => [r.start, i]));

	const cells = marked
		.map((e): GridCell => {
			return {
				row: rowIndex.get(e.start) ?? 0,
				col: e.band ? 0 : (columnOf.get(e) ?? 0),
				rowSpan: rows.filter((r) => r.start >= e.start && r.end <= e.end)
					.length,
				colSpan: e.band ? columns.length : 1,
				band: e.band,
				code: e.code,
				title: e.title,
				trackColor: e.band ? null : e.trackColor,
			};
		})
		.toSorted((a, b) => a.row - b.row || a.col - b.col);

	return {
		columns,
		rows: rows.map((r) =>
			timeRange(time(new Date(r.start)), time(new Date(r.end))),
		),
		cells,
	};
}
