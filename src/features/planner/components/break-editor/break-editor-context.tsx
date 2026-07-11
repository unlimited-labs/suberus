import { useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useState,
} from "react";
import { allBreaksQueryOptions } from "@/features/planner/api/breaks";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import type { PlannerBreak } from "../types";
import { useBreakEditorForm } from "./use-break-editor-form";
import { useBreakEditorMutations } from "./use-break-editor-mutations";

type BreakForm = ReturnType<typeof useBreakEditorForm>;

interface BreakEditorContextValue {
	breakItem: PlannerBreak;
	rooms: Array<{ id: string; name: string; order: number }>;
	form: BreakForm;
	deleting: boolean;
	onDelete: () => Promise<void>;
}

const Context = createContext<BreakEditorContextValue | null>(null);

interface ProviderProps {
	breakId: string;
	onClose: () => void;
	children: ReactNode;
	fallback: ReactNode;
	dirtyRef?: RefObject<boolean>;
}

export function BreakEditorProvider({
	breakId,
	onClose,
	children,
	fallback,
	dirtyRef,
}: ProviderProps) {
	const { data: breaks } = useSuspenseQuery(allBreaksQueryOptions());
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const tz = settings.timezone || undefined;
	const mutations = useBreakEditorMutations(breakId);

	const breakItem = breaks.find((b) => b.id === breakId);
	const form = useBreakEditorForm(breakItem, tz, mutations);
	const [deleting, setDeleting] = useState(false);

	const isDirty = useStore(form.store, (s) => s.isDirty);
	useEffect(() => {
		if (dirtyRef) dirtyRef.current = isDirty;
	}, [dirtyRef, isDirty]);

	if (!breakItem) return <>{fallback}</>;

	const onDelete = async () => {
		setDeleting(true);
		const r = await mutations.deleteBreak();
		if (r !== null) onClose();
		setDeleting(false);
	};

	const value: BreakEditorContextValue = {
		breakItem,
		rooms,
		form,
		deleting,
		onDelete,
	};
	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBreakEditor(): BreakEditorContextValue {
	const ctx = useContext(Context);
	if (!ctx) {
		throw new Error("useBreakEditor must be used within BreakEditorProvider");
	}
	return ctx;
}
