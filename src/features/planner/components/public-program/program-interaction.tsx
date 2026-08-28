import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	favoriteSlotsQueryOptions,
	presentationDetailQueryOptions,
} from "@/features/planner/api/favorites";
import type { ProgramBadge } from "@/features/settings/types";
import { favoriteMutationKey } from "@/integrations/tanstack-query/offline";
import { useSession } from "@/shared/hooks/use-session";
import { PresentationPreviewDialog } from "./presentation-preview-dialog";

export interface PreviewTarget {
	slotId: string;
	submissionTitle: string;
	sessionTitle: string;
	track: { name: string; color: string | null } | null;
	roomName: string | null;
	startAtISO: string;
	/** Set for untimed (poster / lightning) slots: show the block's window, not a per-talk time. */
	untimedEndISO?: string;
	badgeId?: string | null;
	tz?: string;
}

interface ProgramInteractionValue {
	canInteract: boolean;
	showAuthorInfo: boolean;
	resolveBadge: (badgeId: string | null) => ProgramBadge | null;
	isFavorite: (slotId: string) => boolean;
	toggleFavorite: (slotId: string) => void;
	openPreview: (
		target: PreviewTarget,
		opts?: { authorOrderIndex?: number },
	) => void;
}

const ProgramInteractionContext = createContext<ProgramInteractionValue | null>(
	null,
);

export function useProgramInteraction(): ProgramInteractionValue {
	const ctx = useContext(ProgramInteractionContext);
	if (!ctx) {
		throw new Error(
			"useProgramInteraction must be used within a ProgramInteractionProvider",
		);
	}
	return ctx;
}

export function ProgramInteractionProvider({
	themeId,
	showAuthorInfo = false,
	badges = [],
	children,
}: {
	themeId: string;
	showAuthorInfo?: boolean;
	badges?: ProgramBadge[];
	children: ReactNode;
}) {
	const { isAuthenticated } = useSession();
	const authorInfoEnabled = showAuthorInfo && isAuthenticated;
	const queryClient = useQueryClient();
	const [selected, setSelected] = useState<{
		target: PreviewTarget;
		authorOrderIndex: number | null;
	} | null>(null);

	const favoritesQuery = useQuery({
		...favoriteSlotsQueryOptions(),
		enabled: isAuthenticated,
	});

	const favorites = new Set(favoritesQuery.data ?? []);

	// Behaviour lives in setMutationDefaults: an offline toggle resumes at startup.
	// oxlint-disable-next-line typescript/no-invalid-void-type -- void is TData; the rule ignores allowInGenericTypeArguments here
	const { mutate } = useMutation<void, Error, string>({
		mutationKey: favoriteMutationKey,
	});

	usePrefetchFavoriteDetails(favorites, queryClient);

	const value: ProgramInteractionValue = {
		canInteract: isAuthenticated,
		showAuthorInfo: authorInfoEnabled,
		resolveBadge: (badgeId) =>
			badgeId ? (badges.find((b) => b.id === badgeId) ?? null) : null,
		isFavorite: (slotId) => favorites.has(slotId),
		toggleFavorite: (slotId) => mutate(slotId),
		openPreview: (target, opts) =>
			setSelected({ target, authorOrderIndex: opts?.authorOrderIndex ?? null }),
	};

	return (
		<ProgramInteractionContext.Provider value={value}>
			{children}
			<PresentationPreviewDialog
				canInteract={isAuthenticated}
				initialAuthorOrderIndex={selected?.authorOrderIndex ?? null}
				isFavorite={selected ? favorites.has(selected.target.slotId) : false}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
				onToggleFavorite={() => {
					if (selected) mutate(selected.target.slotId);
				}}
				showAuthorInfo={authorInfoEnabled}
				target={selected?.target ?? null}
				themeId={themeId}
			/>
		</ProgramInteractionContext.Provider>
	);
}

// Talk details load lazily on dialog open; warm the favourited ones so an
// attendee's own agenda still opens offline.
function usePrefetchFavoriteDetails(
	favorites: Set<string>,
	queryClient: QueryClient,
) {
	const slotIds = [...favorites].sort().join(",");
	useEffect(() => {
		if (!slotIds) return;
		for (const slotId of slotIds.split(",")) {
			void queryClient.prefetchQuery(presentationDetailQueryOptions(slotId));
		}
	}, [slotIds, queryClient]);
}
