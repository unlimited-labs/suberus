import { IconColumns3 } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableViewOptionsProps<TData> {
	table: Table<TData>;
	columnLabels?: Record<string, string>;
}

export function DataTableViewOptions<TData>({
	table,
	columnLabels = {},
}: DataTableViewOptionsProps<TData>) {
	const columns = table.getAllColumns().filter((column) => column.getCanHide());

	// Get visibility state to trigger re-renders
	const columnVisibility = table.getState().columnVisibility;

	if (columns.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-8">
					<IconColumns3 className="mr-2 size-4" />
					Columns
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[180px]">
				<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{columns.map((column) => {
					const label = columnLabels[column.id] ?? column.id;
					const isVisible = columnVisibility[column.id] !== false;
					return (
						<DropdownMenuCheckboxItem
							key={column.id}
							checked={isVisible}
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
