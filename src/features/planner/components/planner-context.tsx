import { createContext, type ReactNode, useContext, useState } from "react";

type SelectedEvent =
	| { kind: "session"; id: string }
	| { kind: "break"; id: string }
	| null;

interface PlannerSelectionState {
	selectedSessionId: string | null;
	selectedBreakId: string | null;
	selectSession: (id: string) => void;
	selectBreak: (id: string) => void;
	clearSelection: () => void;

	creationSubmissionIds: string[] | null;
	openCreateFromSelection: (ids: string[]) => void;
	closeCreateFromSelection: () => void;

	mobileQueueOpen: boolean;
	setMobileQueueOpen: (open: boolean) => void;
}

const PlannerSelectionContext = createContext<PlannerSelectionState | null>(
	null,
);

export function PlannerSelectionProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [selected, setSelected] = useState<SelectedEvent>(null);
	const [creationSubmissionIds, setCreationSubmissionIds] = useState<
		string[] | null
	>(null);
	const [mobileQueueOpen, setMobileQueueOpen] = useState(false);

	const selectSession = (id: string) => setSelected({ kind: "session", id });
	const selectBreak = (id: string) => setSelected({ kind: "break", id });
	const clearSelection = () => setSelected(null);
	const openCreateFromSelection = (ids: string[]) => {
		setCreationSubmissionIds(ids);
		setMobileQueueOpen(false);
	};
	const closeCreateFromSelection = () => setCreationSubmissionIds(null);

	const value: PlannerSelectionState = {
		selectedSessionId: selected?.kind === "session" ? selected.id : null,
		selectedBreakId: selected?.kind === "break" ? selected.id : null,
		selectSession,
		selectBreak,
		clearSelection,
		creationSubmissionIds,
		openCreateFromSelection,
		closeCreateFromSelection,
		mobileQueueOpen,
		setMobileQueueOpen,
	};

	return (
		<PlannerSelectionContext.Provider value={value}>
			{children}
		</PlannerSelectionContext.Provider>
	);
}

export function usePlannerSelection(): PlannerSelectionState {
	const ctx = useContext(PlannerSelectionContext);
	if (!ctx) {
		throw new Error(
			"usePlannerSelection must be used within PlannerSelectionProvider",
		);
	}
	return ctx;
}
