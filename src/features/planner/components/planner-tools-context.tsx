import { createContext, type ReactNode, useContext } from "react";
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
	onJumpToConferenceStart: (() => void) | null;
}

const Context = createContext<PlannerToolsValue | null>(null);

interface ProviderProps extends PlannerToolsValue {
	children: ReactNode;
}

export function PlannerToolsProvider({
	rooms,
	room,
	defaultStartAt,
	onCreated,
	onSubmissionDrop,
	onJumpToConferenceStart,
	children,
}: ProviderProps) {
	const value: PlannerToolsValue = {
		rooms,
		room,
		defaultStartAt,
		onCreated,
		onSubmissionDrop,
		onJumpToConferenceStart,
	};

	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlannerTools(): PlannerToolsValue {
	const ctx = useContext(Context);
	if (!ctx) {
		throw new Error("usePlannerTools must be used within PlannerToolsProvider");
	}
	return ctx;
}
