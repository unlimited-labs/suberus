import { useCallback, useMemo, useState } from "react";

interface Room {
	id: string;
}

export interface RoomVisibility<R extends Room> {
	hiddenRoomIds: Set<string>;
	visibleRooms: R[];
	hiddenRoomsKey: string;
	toggleRoom: (roomId: string) => void;
	showAll: () => void;
}

/**
 * Tracks which rooms the user hid from the calendar. Storage is in-memory
 * only — returning a stable `hiddenRoomsKey` makes it usable as part of a
 * remount key for components that snapshot resources on mount (e.g. ilamy).
 */
export function useRoomVisibility<R extends Room>(
	rooms: R[],
): RoomVisibility<R> {
	const [hiddenRoomIds, setHiddenRoomIds] = useState<Set<string>>(
		() => new Set(),
	);

	const toggleRoom = useCallback((roomId: string) => {
		setHiddenRoomIds((prev) => {
			const next = new Set(prev);
			if (next.has(roomId)) next.delete(roomId);
			else next.add(roomId);
			return next;
		});
	}, []);

	const showAll = useCallback(() => setHiddenRoomIds(new Set()), []);

	const visibleRooms = useMemo(
		() => rooms.filter((r) => !hiddenRoomIds.has(r.id)),
		[rooms, hiddenRoomIds],
	);

	const hiddenRoomsKey = useMemo(
		() => Array.from(hiddenRoomIds).sort().join(","),
		[hiddenRoomIds],
	);

	return { hiddenRoomIds, visibleRooms, hiddenRoomsKey, toggleRoom, showAll };
}
