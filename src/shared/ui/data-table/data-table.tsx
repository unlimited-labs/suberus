import {
	type ColumnFiltersState,
	type RowData,
	flexRender,
	type RowSelectionState,
	type SortingState,
	useTable,
	type ColumnVisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import { z } from "zod";
import { useTablePagination } from "@/shared/hooks/use-table-pagination";
import { usePersistedState } from "@/shared/hooks/use-persisted-state";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/table";
import { DataTablePagination } from "./data-table-pagination";
import { type AppColumnDef, type AppTable, features } from "./table-features";

const columnVisibilitySchema = z.record(
	z.string(),
	z.boolean(),
) satisfies z.ZodType<ColumnVisibilityState>;

interface DataTableProps<TData extends RowData> {
	columns: AppColumnDef<TData>[];
	data: TData[];
	toolbar?: (
		table: AppTable<TData>,
		rowSelection: RowSelectionState,
	) => React.ReactNode;
	mobileCard?: (row: TData) => React.ReactNode;
	getRowId?: (row: TData) => string;
	/**
	 * Static data-testid applied to each data row (desktop `<tr>` and mobile card
	 * wrapper) — matches twice in the DOM; scope test locators with
	 * `.filter({ visible: true })`.
	 */
	rowDataTestId?: string;
	initialColumnVisibility?: ColumnVisibilityState;
	storageKey?: string;
}

export function DataTable<TData extends RowData>({
	columns,
	data,
	toolbar,
	mobileCard,
	getRowId,
	rowDataTestId,
	initialColumnVisibility,
	storageKey,
}: DataTableProps<TData>) {
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] =
		usePersistedState<ColumnVisibilityState>(
			storageKey ? `suberus.table.columns.${storageKey}` : undefined,
			initialColumnVisibility ?? {},
			{
				schema: columnVisibilitySchema,
				// Keep defaults for columns added since the value was last saved.
				merge: (stored, fallback) => ({ ...fallback, ...stored }),
			},
		);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useTablePagination(storageKey);

	const table = useTable({
		features,
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters,
			pagination,
		},
		getRowId,
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		autoResetPageIndex: true,
	});

	return (
		<div className="space-y-4">
			<div>{toolbar?.(table, rowSelection)}</div>

			<div className="hidden md:block rounded-md border border-border/50">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} colSpan={header.colSpan}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
									data-testid={rowDataTestId}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{mobileCard && (
				<div className="md:hidden space-y-3">
					{/* Cards render the full filtered/sorted set (no pagination) — mobile
					    scrolls instead of paging. ponytail: unbounded card render; add a
					    mobile "load more" cap if a list ever returns thousands of rows. */}
					{table.getSortedRowModel().rows?.length ? (
						table.getSortedRowModel().rows.map((row) => (
							<div key={row.id} data-testid={rowDataTestId}>
								{mobileCard(row.original)}
							</div>
						))
					) : (
						<div className="text-center py-8 text-muted-foreground">
							No results.
						</div>
					)}
				</div>
			)}

			<div className="hidden md:block">
				<DataTablePagination table={table} pagination={pagination} />
			</div>
		</div>
	);
}
