import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { allBreaksQueryOptions } from "@/features/planner/api/breaks";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import {
	addMinutes,
	formatDurationMin,
	tzLocalInputToUtc,
	utcToTzLocalInput,
} from "@/features/planner/tz-datetime";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { useEditorDraft } from "../hooks/use-editor-draft";
import type { PlannerBreak } from "../types";
import { useBreakEditorMutations } from "./use-break-editor-mutations";

type Mutations = ReturnType<typeof useBreakEditorMutations>;

interface BreakDraft {
	title: string;
	startLocal: string;
	durationMin: number;
	roomId: string | null;
}

type Draft = ReturnType<typeof useEditorDraft<BreakDraft>>;

interface BreakEditorContextValue {
	breakItem: PlannerBreak;
	rooms: Array<{ id: string; name: string; order: number }>;
	draft: Draft;
	saving: boolean;
	deleting: boolean;
	mutations: Mutations;
	onSave: () => Promise<void>;
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

function breakDraftInitial(
	breakItem: PlannerBreak | undefined,
	tz: string | undefined,
): BreakDraft {
	if (!breakItem) {
		return { title: "", startLocal: "", durationMin: 0, roomId: null };
	}
	return {
		title: breakItem.title,
		startLocal: utcToTzLocalInput(new Date(breakItem.startAt), tz),
		durationMin: formatDurationMin(
			new Date(breakItem.startAt),
			new Date(breakItem.endAt),
		),
		roomId: breakItem.roomId,
	};
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
	const draft = useEditorDraft<BreakDraft>(
		breakDraftInitial(breakItem, tz),
		breakItem?.id ?? null,
	);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (dirtyRef) dirtyRef.current = draft.dirty;
	}, [dirtyRef, draft.dirty]);

	const value = useMemo<BreakEditorContextValue | null>(() => {
		if (!breakItem) return null;

		const onSave = async () => {
			if (!draft.dirty) return;
			const { title, startLocal, durationMin, roomId } = draft.values;
			if (!startLocal) return;
			const startAt = tzLocalInputToUtc(startLocal, tz);
			const endAt = addMinutes(startAt, Math.max(1, durationMin));
			setSaving(true);
			const result = await mutations.updateHeader({
				title,
				startAt: startAt.toISOString(),
				endAt: endAt.toISOString(),
				roomId,
			});
			setSaving(false);
			if (result !== null) draft.clearDirty();
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
			draft,
			saving,
			deleting,
			mutations,
			onSave,
			onDelete,
		};
	}, [breakItem, tz, rooms, draft, saving, deleting, mutations, onClose]);

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
