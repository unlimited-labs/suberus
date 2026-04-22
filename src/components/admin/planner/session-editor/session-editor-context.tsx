import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import type { AdminUser } from "@/lib/server/admin/users";
import { formatDurationMin } from "@/lib/tz-datetime";
import { adminUsersQueryOptions } from "@/server-fns/admin/users";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import { allSessionsQueryOptions } from "@/server-fns/planner/sessions";
import { allProgramTracksQueryOptions } from "@/server-fns/planner/tracks";
import { conferenceSettingsQueryOptions } from "@/server-fns/settings";
import { useEditableTitle } from "../hooks/use-editable-title";
import { suggestSessionName } from "../suggest-session-name";
import type { PlannerSession } from "../types";
import { useSessionEditorMutations } from "./use-session-editor-mutations";

type Mutations = ReturnType<typeof useSessionEditorMutations>;
type Title = ReturnType<typeof useEditableTitle>;

interface SessionEditorContextValue {
	session: PlannerSession;
	tz: string | undefined;
	rooms: Array<{ id: string; name: string; order: number }>;
	tracks: NonNullable<PlannerSession["track"]>[];
	users: AdminUser[] | undefined;
	sortedPresentations: PlannerSession["presentations"];
	sessionDurationMin: number;
	usedMin: number;
	title: Title;
	deleting: boolean;
	mutations: Mutations;
	onSaveTitle: () => Promise<void>;
	onSuggestName: () => void;
	onDelete: () => Promise<void>;
}

const Context = createContext<SessionEditorContextValue | null>(null);

interface ProviderProps {
	sessionId: string;
	onClose: () => void;
	children: ReactNode;
	fallback: ReactNode;
}

export function SessionEditorProvider({
	sessionId,
	onClose,
	children,
	fallback,
}: ProviderProps) {
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: tracks } = useSuspenseQuery(allProgramTracksQueryOptions());
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const { data: users } = useQuery(adminUsersQueryOptions());
	const tz = settings.timezone || undefined;
	const mutations = useSessionEditorMutations(sessionId);

	const session = sessions.find((s) => s.id === sessionId);
	const title = useEditableTitle(session?.title ?? "", session?.id ?? null);
	const [deleting, setDeleting] = useState(false);

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

		const onSaveTitle = async () => {
			if (!title.dirty) return;
			await mutations.updateTitle(title.value);
			title.clearDirty();
		};

		const onSuggestName = () => {
			const suggestion = suggestSessionName(
				session.presentations.map((p) => ({
					id: p.submissionId,
					title: p.submissionTitle,
					type: "ABSTRACT",
					abstract: null,
					trackId: null,
					trackName: null,
					authors: p.authors,
					keywords: [],
				})),
			);
			if (suggestion && suggestion !== "Session") {
				title.set(suggestion);
			} else {
				toast.info("No suggestion available (need common title words)");
			}
		};

		const onDelete = async () => {
			setDeleting(true);
			const result = await mutations.deleteSession();
			setDeleting(false);
			if (result !== null) onClose();
		};

		return {
			session,
			tz,
			rooms,
			tracks,
			users,
			sortedPresentations,
			sessionDurationMin,
			usedMin,
			title,
			deleting,
			mutations,
			onSaveTitle,
			onSuggestName,
			onDelete,
		};
	}, [session, tz, rooms, tracks, users, title, deleting, mutations, onClose]);

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
