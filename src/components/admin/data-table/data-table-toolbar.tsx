import { IconSearch, IconX } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
	table: Table<TData>;
	searchKey?: string;
	searchPlaceholder?: string;
	filters?: React.ReactNode;
	actions?: React.ReactNode;
	columnLabels?: Record<string, string>;
}

export function DataTableToolbar<TData>({
	table,
	searchKey,
	searchPlaceholder = "Search...",
	filters,
	actions,
	columnLabels,
}: DataTableToolbarProps<TData>) {
	const isFiltered = table.getState().columnFilters.length > 0;
	const columnFilterValue = searchKey
		? ((table.getColumn(searchKey)?.getFilterValue() as string) ?? "")
		: "";
	const [searchValue, setSearchValue] = useState(columnFilterValue);

	// Sync local state with external filter changes (e.g., reset)
	useEffect(() => {
		setSearchValue(columnFilterValue);
	}, [columnFilterValue]);

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-1 flex-wrap items-center gap-2">
				{searchKey && (
					<div className="relative">
						<IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={searchPlaceholder}
							value={searchValue}
							onChange={(event) => {
								const value = event.target.value;
								setSearchValue(value);
								table.getColumn(searchKey)?.setFilterValue(value || undefined);
							}}
							className="h-8 w-[150px] pl-8 pr-8 lg:w-[250px]"
						/>
						{searchValue && (
							<button
								type="button"
								onClick={() => {
									setSearchValue("");
									table.getColumn(searchKey)?.setFilterValue(undefined);
								}}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<IconX className="size-4" />
								<span className="sr-only">Clear search</span>
							</button>
						)}
					</div>
				)}
				{filters}
				{isFiltered && (
					<Button
						variant="ghost"
						onClick={() => table.resetColumnFilters()}
						className="h-8 px-2 lg:px-3"
					>
						Reset
						<IconX className="ml-2 size-4" />
					</Button>
				)}
			</div>
			<div className="flex items-center gap-2">
				{actions}
				<DataTableViewOptions
					table={table}
					columnLabels={columnLabels}
					key={JSON.stringify(table.getState().columnVisibility)}
				/>
			</div>
		</div>
	);
}
