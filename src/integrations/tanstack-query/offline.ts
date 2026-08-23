import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { onlineManager, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	favoriteSlotsQueryOptions,
	type PresentationDetail,
	toggleFavoriteFn,
} from "@/features/planner/api/favorites";
import { publicConferenceInfoQueryOptions } from "@/features/planner/api/schedule";

const PERSIST_KEY = "suberus-program-cache";
const PERSIST_VERSION = "5";
const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

const PERSISTED_KEYS = [
	["program", "public"],
	["program", "favorites"],
	["program", "presentation"],
	["conference", "public-info"],
	["participants", "public"],
] as const;

const ROSTER_KEY = ["participants", "public"] as const;
const PRESENTATION_KEY = ["program", "presentation"] as const;

const isPersistedKey = (key: readonly unknown[]) =>
	PERSISTED_KEYS.some(([root, branch]) => key[0] === root && key[1] === branch);

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
	for (const key of PERSISTED_KEYS) {
		activeQueryClient?.removeQueries({ queryKey: key });
	}
	window.localStorage.removeItem(PERSIST_KEY);
	await caches?.delete(SW_CACHE).catch(() => false);
}

/**
 * The persisted cache outlives a session, so an expired login or an admin turning
 * author info off would otherwise leave contact data readable for the full 24h.
 */
function purgeContactDataOnEntitlementLoss(queryClient: QueryClient) {
	const infoKey = publicConferenceInfoQueryOptions().queryKey;

	queryClient.getQueryCache().subscribe((event) => {
		if (event.type !== "updated") return;
		const [root, branch] = event.query.queryKey;
		if (root !== infoKey[0] || branch !== infoKey[1]) return;

		const info = queryClient.getQueryData(infoKey);
		if (!info || (info.viewerIsParticipant && info.showAuthorInfo)) return;

		queryClient.removeQueries({ queryKey: ROSTER_KEY });

		// The abstract itself is public, so drop only the details fetched back when
		// the author block was still filled in.
		const cache = queryClient.getQueryCache();
		for (const query of cache.findAll({ queryKey: PRESENTATION_KEY })) {
			const detail = queryClient.getQueryData<PresentationDetail>(
				query.queryKey,
			);
			const hasContact = detail?.authors.some(
				(a) => a.email || a.orcid || a.website || a.linkedin,
			);
			if (hasContact) cache.remove(query);
		}
	});
}

export function setupOfflineProgram(queryClient: QueryClient) {
	activeQueryClient = queryClient;

	// onlineManager starts optimistic and only learns from online/offline events,
	// so a tab opened while already offline would treat fetches as online.
	onlineManager.setOnline(navigator.onLine);

	// Safari drops script-created storage after 7 days without a visit to the origin,
	// which would empty the cache before a conference the attendee installed for.
	if ("storage" in navigator) void navigator.storage.persist().catch(() => {});

	purgeContactDataOnEntitlementLoss(queryClient);

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
			// A null payload means the server refused the viewer the data — never
			// persist that, it is what keeps the roster to paid participants.
			shouldDehydrateQuery: (query) =>
				query.state.status === "success" &&
				query.state.data !== null &&
				isPersistedKey(query.queryKey),
			shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
		},
	});

	// A rejected restore (corrupt or unreadable cache) already discarded it, so the
	// app runs fine cold — swallowing it here keeps that off the unhandled path.
	void restored.then(() => queryClient.resumePausedMutations()).catch(() => {});
}
