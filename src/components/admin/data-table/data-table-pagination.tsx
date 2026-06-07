import {
	IconChevronLeft,
	IconChevronRight,
	IconChevronsLeft,
	IconChevronsRight,
} from "@tabler/icons-react";
import type { PaginationState, Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
	table: Table<TData>;
	/**
	 * Authoritative pagination state owned by the parent. Display values are read
	 * from here rather than `table.getState()` because the shared table instance's
	 * options are mutated during render, so reads off `table` in this child can
	 * tear (return a stale page size). Table methods are still used for actions.
	 */
	pagination: PaginationState;
}

export function DataTablePagination<TData>({
	table,
	pagination,
}: DataTablePaginationProps<TData>) {
	const totalRows = table.getFilteredRowModel().rows.length;
	const { pageSize, pageIndex } = pagination;
	// Derived from the parent-owned pagination state, not `table.getState()`
	// (see prop doc). Floor at 1 so an empty table reads "Page 1 of 1" rather
	// than the "of 0" TanStack's getPageCount() would yield next to "No results.".
	const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
	const canPreviousPage = pageIndex > 0;
	const canNextPage = pageIndex < pageCount - 1;

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
			<div className="text-foreground/70 text-sm">
				{table.getSelectedRowModel().rows.length > 0 && (
					<span>
						{table.getSelectedRowModel().rows.length} of {totalRows} row(s)
						selected
					</span>
				)}
			</div>
			<div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
				<div className="flex items-center gap-2">
					<p className="text-sm font-medium text-foreground hidden sm:block">
						Rows per page
					</p>
					<Select
						value={`${pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
					>
						<SelectTrigger className="h-8 w-[70px]" data-testid="rows-per-page">
							{pageSize}
						</SelectTrigger>
						<SelectContent side="top">
							{[10, 20, 30, 40, 50, 100, 200].map((size) => (
								<SelectItem key={size} value={`${size}`}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center justify-center text-sm font-medium text-foreground">
					Page {pageIndex + 1} of {pageCount}
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => table.setPageIndex(0)}
						disabled={!canPreviousPage}
					>
						<span className="sr-only">Go to first page</span>
						<IconChevronsLeft className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => table.previousPage()}
						disabled={!canPreviousPage}
					>
						<span className="sr-only">Go to previous page</span>
						<IconChevronLeft className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => table.nextPage()}
						disabled={!canNextPage}
					>
						<span className="sr-only">Go to next page</span>
						<IconChevronRight className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => table.setPageIndex(pageCount - 1)}
						disabled={!canNextPage}
					>
						<span className="sr-only">Go to last page</span>
						<IconChevronsRight className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
