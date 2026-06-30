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
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import { allSessionsQueryOptions } from "@/features/planner/api/sessions";
import { allProgramTracksQueryOptions } from "@/features/planner/api/tracks";
import {
	addMinutes,
	formatDurationMin,
	tzLocalInputToUtc,
	utcToTzLocalInput,
} from "@/features/planner/tz-datetime";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { useEditorDraft } from "../hooks/use-editor-draft";
import type { ChairCandidate, PlannerSession } from "../types";
import { useSessionEditorMutations } from "./use-session-editor-mutations";

type Mutations = ReturnType<typeof useSessionEditorMutations>;

interface SessionDraft {
	title: string;
	startLocal: string;
	slotCount: number;
	slotMin: number;
	roomId: string | null;
	trackId: string | null;
}

type Draft = ReturnType<typeof useEditorDraft<SessionDraft>>;

interface SessionEditorContextValue {
	session: PlannerSession;
	rooms: Array<{ id: string; name: string; order: number }>;
	tracks: NonNullable<PlannerSession["track"]>[];
	users: ChairCandidate[];
	sortedPresentations: PlannerSession["presentations"];
	sessionDurationMin: number;
	usedMin: number;
	draft: Draft;
	saving: boolean;
	deleting: boolean;
	mutations: Mutations;
	onSave: () => Promise<void>;
	onDelete: () => Promise<void>;
}

const Context = createContext<SessionEditorContextValue | null>(null);

interface ProviderProps {
	sessionId: string;
	onClose: () => void;
	children: ReactNode;
	fallback: ReactNode;
	/** Chair candidates, fetched by the route (planner stays off the users slice). */
	users: ChairCandidate[];
	dirtyRef?: RefObject<boolean>;
}

function sessionDraftInitial(
	session: PlannerSession | undefined,
	tz: string | undefined,
	defaultPresentationMin: number,
): SessionDraft {
	if (!session) {
		return {
			title: "",
			startLocal: "",
			slotCount: 1,
			slotMin: defaultPresentationMin,
			roomId: null,
			trackId: null,
		};
	}
	const durationMin = formatDurationMin(
		new Date(session.startAt),
		new Date(session.endAt),
	);
	const slotMin =
		[...session.presentations].sort((a, b) => a.order - b.order)[0]
			?.durationMin ?? defaultPresentationMin;
	return {
		title: session.title,
		startLocal: utcToTzLocalInput(new Date(session.startAt), tz),
		slotCount: Math.max(1, Math.round(durationMin / Math.max(1, slotMin))),
		slotMin,
		roomId: session.roomId,
		trackId: session.trackId,
	};
}

export function SessionEditorProvider({
	sessionId,
	onClose,
	children,
	fallback,
	users,
	dirtyRef,
}: ProviderProps) {
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: tracks } = useSuspenseQuery(allProgramTracksQueryOptions());
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const tz = settings.timezone || undefined;
	const mutations = useSessionEditorMutations(sessionId);

	const session = sessions.find((s) => s.id === sessionId);
	const draft = useEditorDraft<SessionDraft>(
		sessionDraftInitial(session, tz, settings.defaultPresentationMin),
		session?.id ?? null,
	);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		if (dirtyRef) dirtyRef.current = draft.dirty;
	}, [dirtyRef, draft.dirty]);

	const value = useMemo<SessionEditorContextValue | null>(() => {
		if (!session) return null;

		const sortedPresentations = [...session.presentations].sort(
			(a, b) => a.order - b.order,
		);
		const sessionDurationMin = formatDurationMin(
			new Date(session.startAt),
			new Date(session.endAt),
		);
		const usedMin = sortedPresentations.reduce((s, p) => s + p.durationMin, 0);

		const onSave = async () => {
			if (!draft.dirty) return;
			const { title, startLocal, slotCount, slotMin, roomId, trackId } =
				draft.values;
			if (!startLocal) return;
			const startAt = tzLocalInputToUtc(startLocal, tz);
			const endAt = addMinutes(startAt, Math.max(1, slotCount * slotMin));
			setSaving(true);
			const result = await mutations.updateHeader({
				title,
				startAt: startAt.toISOString(),
				endAt: endAt.toISOString(),
				roomId,
				trackId,
			});
			setSaving(false);
			if (result !== null) draft.clearDirty();
		};

		const onDelete = async () => {
			setDeleting(true);
			const result = await mutations.deleteSession();
			setDeleting(false);
			if (result !== null) onClose();
		};

		return {
			session,
			rooms,
			tracks,
			users,
			sortedPresentations,
			sessionDurationMin,
			usedMin,
			draft,
			saving,
			deleting,
			mutations,
			onSave,
			onDelete,
		};
	}, [
		session,
		tz,
		rooms,
		tracks,
		users,
		draft,
		saving,
		deleting,
		mutations,
		onClose,
	]);

	if (!value) return <>{fallback}</>;
	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSessionEditor(): SessionEditorContextValue {
	const ctx = useContext(Context);
	if (!ctx) {
		throw new Error(
			"useSessionEditor must be used within SessionEditorProvider",
		);
	}
	return ctx;
}
