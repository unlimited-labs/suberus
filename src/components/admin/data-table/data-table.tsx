import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	toolbar?: (
		table: ReturnType<typeof useReactTable<TData>>,
		rowSelection: RowSelectionState,
	) => React.ReactNode;
	mobileCard?: (row: TData) => React.ReactNode;
	getRowId?: (row: TData) => string;
	/** Static data-testid applied to each data row (desktop `<tr>` and mobile card wrapper) */
	rowDataTestId?: string;
	/** Initial column visibility, e.g. to hide filter-only helper columns */
	initialColumnVisibility?: VisibilityState;
	/** When set, column visibility is persisted to localStorage under this key (per-table). */
	storageKey?: string;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	toolbar,
	mobileCard,
	getRowId,
	rowDataTestId,
	initialColumnVisibility,
	storageKey,
}: DataTableProps<TData, TValue>) {
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] =
		usePersistedState<VisibilityState>(
			storageKey ? `suberus.table.columns.${storageKey}` : undefined,
			initialColumnVisibility ?? {},
			{
				merge: (stored, fallback) =>
					stored && typeof stored === "object" && !Array.isArray(stored)
						? { ...fallback, ...stored }
						: fallback,
			},
		);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pagination, setPagination] = useTablePagination(storageKey);

	const table = useReactTable({
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
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
	});

	return (
		<div className="space-y-4">
			<div>{toolbar?.(table, rowSelection)}</div>

			{/* Desktop Table */}
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

			{/* Mobile Cards */}
			{mobileCard && (
				<div className="md:hidden space-y-3">
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
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

			<DataTablePagination table={table} pagination={pagination} />
		</div>
	);
}
