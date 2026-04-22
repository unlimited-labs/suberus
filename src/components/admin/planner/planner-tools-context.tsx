import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { RoomVisibility } from "./hooks/use-room-visibility";

interface Room {
	id: string;
	name: string;
}

interface PlannerToolsValue {
	rooms: Room[];
	room: RoomVisibility<Room>;
	defaultStartAt: Date;
	onCreated: () => void;
	onSubmissionDrop: (sessionId: string, submissionId: string) => void;
}

const Context = createContext<PlannerToolsValue | null>(null);

interface ProviderProps extends PlannerToolsValue {
	children: ReactNode;
}

/**
 * Groups the pass-through pieces consumed by ilamy-embedded components
 * (calendar header, event renderer, event form) so `PlannerCalendar`
 * doesn't drill 7+ props into indirect consumers.
 */
export function PlannerToolsProvider({
	rooms,
	room,
	defaultStartAt,
	onCreated,
	onSubmissionDrop,
	children,
}: ProviderProps) {
	const value = useMemo<PlannerToolsValue>(
		() => ({ rooms, room, defaultStartAt, onCreated, onSubmissionDrop }),
		[rooms, room, defaultStartAt, onCreated, onSubmissionDrop],
	);

	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlannerTools(): PlannerToolsValue {
	const ctx = useContext(Context);
	if (!ctx) {
		throw new Error("usePlannerTools must be used within PlannerToolsProvider");
	}
	return ctx;
}
