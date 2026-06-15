import { IconSearch, IconX } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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
	// Local source of truth for the search input. Reading the value from
	// `table.getState()` during this child's render can tear (return a stale
	// slice) when the parent re-renders mid-cycle, freezing the controlled
	// input at "". See reference_tanstack_table_getstate_tearing.
	const [searchValue, setSearchValue] = useState(() =>
		searchKey ? ((table.getColumn(searchKey)?.getFilterValue() as string) ?? "") : "",
	);

	const handleSearchChange = (value: string) => {
		setSearchValue(value);
		if (searchKey) {
			table.getColumn(searchKey)?.setFilterValue(value || undefined);
		}
	};

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-1 flex-wrap items-center gap-2">
				{searchKey && (
					<div className="relative">
						<IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={searchPlaceholder}
							value={searchValue}
							onChange={(event) => handleSearchChange(event.target.value)}
							className="h-8 w-[150px] pl-8 pr-8 lg:w-[250px]"
							data-testid="data-table-search"
						/>
						{searchValue && (
							<button
								type="button"
								onClick={() => handleSearchChange("")}
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
						onClick={() => {
							table.resetColumnFilters();
							setSearchValue("");
						}}
						className="h-8 px-2 lg:px-3"
					>
						Reset
						<IconX className="ml-2 size-4" />
					</Button>
				)}
			</div>
			<div className="flex items-center gap-2">
				{actions}
				<DataTableViewOptions table={table} columnLabels={columnLabels} />
			</div>
		</div>
	);
}
