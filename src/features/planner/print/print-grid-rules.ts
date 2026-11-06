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
	rows: string[];
	cells: GridCell[];
}

export interface GridEntry {
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
	for (const e of entries) {
		const list = byRoom.get(e.roomId) ?? [];
		list.push(e);
		byRoom.set(e.roomId, list);
	}
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

export function buildGrid(
	entries: GridEntry[],
	time: (d: Date) => string,
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
	const laneColumns = rooms.flatMap((roomId) =>
		Array.from({ length: laneCount.get(roomId) ?? 0 }, (_, i) => ({
			room: roomName(roomId),
			lane: i + 1,
			lanes: laneCount.get(roomId) ?? 0,
		})),
	);
	const columns =
		laneColumns.length > 0 ? laneColumns : [{ room: "", lane: 1, lanes: 1 }];
	const firstCol = new Map<string | null, number>();
	rooms.reduce((at, r) => {
		firstCol.set(r, at);
		return at + (laneCount.get(r) ?? 0);
	}, 0);

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
			const lane = laneOf.get(e);
			return {
				row: rowIndex.get(e.start) ?? 0,
				col:
					e.band || !lane
						? 0
						: (firstCol.get(lane.roomId) ?? 0) + lane.lane - 1,
				rowSpan: rows.filter((r) => r.start >= e.start && r.end <= e.end)
					.length,
				colSpan: e.band ? columns.length : 1,
				band: e.band,
				code: e.code,
				title: e.title,
				trackColor: e.trackColor,
			};
		})
		.toSorted((a, b) => a.row - b.row || a.col - b.col);

	return {
		columns,
		rows: rows.map(
			(r) => `${time(new Date(r.start))}–${time(new Date(r.end))}`,
		),
		cells,
	};
}
