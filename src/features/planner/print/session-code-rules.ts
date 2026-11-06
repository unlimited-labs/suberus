export interface CodableSession {
	id: string;
	dayIndex: number;
	roomId: string | null;
	startAt: Date;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWYZ";
const NO_ROOM_LETTER = "X";

export function roomLetter(rank: number): string {
	let n = rank + 1;
	let out = "";
	while (n > 0) {
		const r = (n - 1) % LETTERS.length;
		out = LETTERS.charAt(r) + out;
		n = Math.floor((n - 1) / LETTERS.length);
	}
	return out;
}

export function assignSessionCodes(
	sessions: readonly CodableSession[],
	roomRank: ReadonlyMap<string, number>,
): Map<string, string> {
	const letterOf = (roomId: string | null) => {
		const r = roomId === null ? undefined : roomRank.get(roomId);
		return r === undefined ? NO_ROOM_LETTER : roomLetter(r);
	};
	const counters = new Map<string, number>();
	const codes = new Map<string, string>();
	const ordered = sessions.toSorted(
		(a, b) =>
			a.dayIndex - b.dayIndex || a.startAt.getTime() - b.startAt.getTime(),
	);
	for (const s of ordered) {
		const prefix = `${s.dayIndex}${letterOf(s.roomId)}`;
		const nth = (counters.get(prefix) ?? 0) + 1;
		counters.set(prefix, nth);
		codes.set(s.id, `${prefix}${nth}`);
	}
	return codes;
}
