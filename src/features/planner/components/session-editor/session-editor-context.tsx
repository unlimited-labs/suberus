import { useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
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
import { formatDurationMin } from "@/features/planner/tz-datetime";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import type { ChairCandidate, PlannerSession } from "../types";
import { useSessionEditorForm } from "./use-session-editor-form";
import { useSessionEditorMutations } from "./use-session-editor-mutations";

type Mutations = ReturnType<typeof useSessionEditorMutations>;
type SessionForm = ReturnType<typeof useSessionEditorForm>;

interface SessionEditorContextValue {
	session: PlannerSession;
	rooms: Array<{ id: string; name: string; order: number }>;
	tracks: NonNullable<PlannerSession["track"]>[];
	users: ChairCandidate[];
	sortedPresentations: PlannerSession["presentations"];
	sessionDurationMin: number;
	usedMin: number;
	form: SessionForm;
	deleting: boolean;
	mutations: Mutations;
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
	const form = useSessionEditorForm(
		session,
		tz,
		settings.defaultPresentationMin,
		mutations,
	);
	const [deleting, setDeleting] = useState(false);

	const isDirty = useStore(form.store, (s) => s.isDirty);
	useEffect(() => {
		if (dirtyRef) dirtyRef.current = isDirty;
	}, [dirtyRef, isDirty]);

	const value = useMemo<SessionEditorContextValue | null>(() => {
		if (!session) return null;

		const sortedPresentations = session.presentations.toSorted(
			(a, b) => a.order - b.order,
		);
		const sessionDurationMin = formatDurationMin(
			new Date(session.startAt),
			new Date(session.endAt),
		);
		const usedMin = sortedPresentations.reduce((s, p) => s + p.durationMin, 0);

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
			form,
			deleting,
			mutations,
			onDelete,
		};
	}, [session, rooms, tracks, users, form, deleting, mutations, onClose]);

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
