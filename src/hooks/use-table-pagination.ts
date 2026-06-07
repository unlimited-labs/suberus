import type { PaginationState } from "@tanstack/react-table";
import { usePersistedState } from "@/hooks/use-persisted-state";

const DEFAULT_PAGE_SIZE = 20;

/**
 * Table pagination state with the page size persisted to localStorage per-table.
 * The page position (`pageIndex`) is intentionally not persisted — it resets to 0
 * on entry; only the user's rows-per-page preference is remembered.
 * When `storageKey` is undefined the hook behaves like a plain useState.
 */
export function useTablePagination(storageKey?: string) {
	return usePersistedState<PaginationState>(
		storageKey ? `suberus.table.pagination.${storageKey}` : undefined,
		{ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
		{
			merge: (stored, fallback) => ({
				pageIndex: 0,
				pageSize:
					typeof stored?.pageSize === "number"
						? stored.pageSize
						: fallback.pageSize,
			}),
		},
	);
}
