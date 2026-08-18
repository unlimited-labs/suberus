import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useState } from "react";
import { toast } from "sonner";
import {
	favoriteSlotsQueryOptions,
	toggleFavoriteFn,
} from "@/features/planner/api/favorites";
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
	tz?: string;
}

interface ProgramInteractionValue {
	canInteract: boolean;
	showAuthorInfo: boolean;
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
	children,
}: {
	themeId: string;
	showAuthorInfo?: boolean;
	children: ReactNode;
}) {
	const { isAuthenticated } = useSession();
	const authorInfoEnabled = showAuthorInfo && isAuthenticated;
	const queryClient = useQueryClient();
	const [selected, setSelected] = useState<{
		target: PreviewTarget;
		authorOrderIndex: number | null;
	} | null>(null);

	const favoritesKey = favoriteSlotsQueryOptions().queryKey;
	const favoritesQuery = useQuery({
		...favoriteSlotsQueryOptions(),
		enabled: isAuthenticated,
	});

	const favorites = new Set(favoritesQuery.data ?? []);

	const { mutate } = useMutation({
		mutationFn: (slotId: string) => toggleFavoriteFn({ data: { slotId } }),
		onMutate: async (slotId: string) => {
			await queryClient.cancelQueries({ queryKey: favoritesKey });
			const previous = queryClient.getQueryData<string[]>(favoritesKey) ?? [];
			const next = previous.includes(slotId)
				? previous.filter((id) => id !== slotId)
				: [...previous, slotId];
			queryClient.setQueryData(favoritesKey, next);
			return { previous };
		},
		onError: (_e, _slotId, context) => {
			if (context) queryClient.setQueryData(favoritesKey, context.previous);
			toast.error("Could not update favorites");
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKey }),
	});

	const value: ProgramInteractionValue = {
		canInteract: isAuthenticated,
		showAuthorInfo: authorInfoEnabled,
		isFavorite: (slotId) => favorites.has(slotId),
		toggleFavorite: (slotId) => mutate(slotId),
		openPreview: (target, opts) =>
			setSelected({ target, authorOrderIndex: opts?.authorOrderIndex ?? null }),
	};

	return (
		<ProgramInteractionContext.Provider value={value}>
			{children}
			<PresentationPreviewDialog
				target={selected?.target ?? null}
				themeId={themeId}
				canInteract={isAuthenticated}
				showAuthorInfo={authorInfoEnabled}
				initialAuthorOrderIndex={selected?.authorOrderIndex ?? null}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
				isFavorite={selected ? favorites.has(selected.target.slotId) : false}
				onToggleFavorite={() => {
					if (selected) mutate(selected.target.slotId);
				}}
			/>
		</ProgramInteractionContext.Provider>
	);
}
