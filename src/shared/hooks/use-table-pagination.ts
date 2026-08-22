import type { PaginationState } from "@tanstack/react-table";
import { z } from "zod";
import { usePersistedState } from "@/shared/hooks/use-persisted-state";

const DEFAULT_PAGE_SIZE = 20;

const paginationSchema = z.object({
	pageIndex: z.number(),
	pageSize: z.number(),
}) satisfies z.ZodType<PaginationState>;

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
			schema: paginationSchema,
			merge: (stored) => ({ pageIndex: 0, pageSize: stored.pageSize }),
		},
	);
}
