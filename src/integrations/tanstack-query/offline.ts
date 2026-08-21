import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { onlineManager, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	favoriteSlotsQueryOptions,
	toggleFavoriteFn,
} from "@/features/planner/api/favorites";

const PERSIST_KEY = "suberus-program-cache";
/** Bump when a persisted payload's shape changes, to drop incompatible caches. */
const PERSIST_VERSION = "2";
const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;
const PERSISTED_PREFIXES = ["program", "conference"];

export const favoriteMutationKey = ["program", "favorite"];

/** Service-worker cache holding the SSR'd /program document. Keep in sync with public/sw.js. */
const SW_CACHE = "suberus-program-v1";

let activeQueryClient: QueryClient | null = null;

/**
 * Drop everything the previous user left behind on a shared device: the persisted
 * queries, the in-memory ones the persister would otherwise write straight back,
 * and the cached document — which for an admin embeds the unpublished draft.
 */
export async function clearOfflineProgramCache() {
	if (!("window" in globalThis)) return;
	for (const prefix of PERSISTED_PREFIXES) {
		activeQueryClient?.removeQueries({ queryKey: [prefix] });
	}
	window.localStorage.removeItem(PERSIST_KEY);
	await caches?.delete(SW_CACHE).catch(() => false);
}

/**
 * Offline-first support for the public programme: persists its queries to
 * localStorage and registers the favourite-toggle mutation centrally, so a
 * toggle made offline can be resumed at startup from any route.
 */
export function setupOfflineProgram(queryClient: QueryClient) {
	activeQueryClient = queryClient;

	// onlineManager starts optimistic and only learns from online/offline events,
	// so a tab opened while already offline would treat fetches as online.
	onlineManager.setOnline(navigator.onLine);

	const favoritesKey = favoriteSlotsQueryOptions().queryKey;

	queryClient.setMutationDefaults(favoriteMutationKey, {
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
		onError: (_error, _slotId, context) => {
			// SAFETY: the matching onMutate returns this context.
			const previous = (context as { previous?: string[] } | undefined)
				?.previous;
			if (previous) queryClient.setQueryData(favoritesKey, previous);
			toast.error("Could not update favorites");
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: favoritesKey }),
	});

	const [, restored] = persistQueryClient({
		queryClient,
		persister: createSyncStoragePersister({
			storage: window.localStorage,
			key: PERSIST_KEY,
		}),
		maxAge: PERSIST_MAX_AGE,
		buster: PERSIST_VERSION,
		dehydrateOptions: {
			shouldDehydrateQuery: (query) =>
				query.state.status === "success" &&
				PERSISTED_PREFIXES.includes(String(query.queryKey[0])),
			shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
		},
	});

	void restored.then(() => queryClient.resumePausedMutations());
}
