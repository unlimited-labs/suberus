import { IconColumns3 } from "@tabler/icons-react";
import type { RowData } from "@tanstack/react-table";
import type { AppTable } from "./table-features";

import { Button } from "@/shared/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface DataTableViewOptionsProps<TData extends RowData> {
	table: AppTable<TData>;
	columnLabels?: Record<string, string>;
}

export function DataTableViewOptions<TData extends RowData>({
	table,
	columnLabels = {},
}: DataTableViewOptionsProps<TData>) {
	const hideableColumns = table
		.getAllColumns()
		.filter((column) => column.getCanHide());

	if (hideableColumns.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="hidden h-8 sm:flex">
					<IconColumns3 className="mr-2 size-4" />
					Columns
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[180px]">
				<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{hideableColumns.map((column) => {
					const label = columnLabels[column.id] ?? column.id;
					return (
						<DropdownMenuCheckboxItem
							key={column.id}
							checked={column.getIsVisible()}
							onCheckedChange={(value) => column.toggleVisibility(!!value)}
						>
							{label}
						</DropdownMenuCheckboxItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
