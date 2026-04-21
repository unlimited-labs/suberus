import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import { allRoomsQueryOptions } from "@/utils/rooms.functions";
import { allBreaksQueryOptions } from "@/utils/schedule-breaks.functions";
import { useEditableTitle } from "../hooks/use-editable-title";
import type { PlannerBreak } from "../types";
import { useBreakEditorMutations } from "./use-break-editor-mutations";

type Mutations = ReturnType<typeof useBreakEditorMutations>;
type Title = ReturnType<typeof useEditableTitle>;

interface BreakEditorContextValue {
	breakItem: PlannerBreak;
	rooms: Array<{ id: string; name: string; order: number }>;
	title: Title;
	deleting: boolean;
	mutations: Mutations;
	onSaveTitle: () => Promise<void>;
	onDelete: () => Promise<void>;
}

const Context = createContext<BreakEditorContextValue | null>(null);

interface ProviderProps {
	breakId: string;
	onClose: () => void;
	children: ReactNode;
	fallback: ReactNode;
}

export function BreakEditorProvider({
	breakId,
	onClose,
	children,
	fallback,
}: ProviderProps) {
	const { data: breaks } = useSuspenseQuery(allBreaksQueryOptions());
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const mutations = useBreakEditorMutations(breakId);

	const breakItem = breaks.find((b) => b.id === breakId);
	const title = useEditableTitle(breakItem?.title ?? "", breakItem?.id ?? null);
	const [deleting, setDeleting] = useState(false);

	const value = useMemo<BreakEditorContextValue | null>(() => {
		if (!breakItem) return null;

		const onSaveTitle = async () => {
			if (!title.dirty) return;
			const r = await mutations.updateTitle(title.value);
			if (r !== null) title.clearDirty();
		};

		const onDelete = async () => {
			setDeleting(true);
			const r = await mutations.deleteBreak();
			if (r !== null) onClose();
			setDeleting(false);
		};

		return {
			breakItem,
			rooms,
			title,
			deleting,
			mutations,
			onSaveTitle,
			onDelete,
		};
	}, [breakItem, rooms, title, deleting, mutations, onClose]);

	if (!value) return <>{fallback}</>;
	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBreakEditor(): BreakEditorContextValue {
	const ctx = useContext(Context);
	if (!ctx) {
		throw new Error("useBreakEditor must be used within BreakEditorProvider");
	}
	return ctx;
}
