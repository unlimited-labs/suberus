import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

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

	const selectSession = useCallback(
		(id: string) => setSelected({ kind: "session", id }),
		[],
	);
	const selectBreak = useCallback(
		(id: string) => setSelected({ kind: "break", id }),
		[],
	);
	const clearSelection = useCallback(() => setSelected(null), []);
	const openCreateFromSelection = useCallback((ids: string[]) => {
		setCreationSubmissionIds(ids);
		setMobileQueueOpen(false);
	}, []);
	const closeCreateFromSelection = useCallback(
		() => setCreationSubmissionIds(null),
		[],
	);

	const value = useMemo<PlannerSelectionState>(
		() => ({
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
		}),
		[
			selected,
			selectSession,
			selectBreak,
			clearSelection,
			creationSubmissionIds,
			openCreateFromSelection,
			closeCreateFromSelection,
			mobileQueueOpen,
		],
	);

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
