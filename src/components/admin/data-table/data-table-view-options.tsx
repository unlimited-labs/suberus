import { IconColumns3 } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";
import { useState } from "react";

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
	const hideableColumns = table
		.getAllColumns()
		.filter((column) => column.getCanHide());

	const readVisibility = (): Record<string, boolean> =>
		Object.fromEntries(hideableColumns.map((c) => [c.id, c.getIsVisible()]));

	// The dropdown lives in a portal and does not re-render from the table's
	// columnVisibility change, so the checkboxes would show a stale state — a
	// hidden column could not be shown again, because radix derives the next
	// value as `!checked` from a frozen `checked` prop. Mirror visibility in
	// local state (drives the checkboxes, re-renders immediately on toggle) and
	// re-sync from the columns whenever the menu opens.
	const [visibility, setVisibility] =
		useState<Record<string, boolean>>(readVisibility);

	if (hideableColumns.length === 0) return null;

	const toggle = (columnId: string, visible: boolean) => {
		table.getColumn(columnId)?.toggleVisibility(visible);
		setVisibility((prev) => ({ ...prev, [columnId]: visible }));
	};

	return (
		<DropdownMenu
			onOpenChange={(open) => {
				if (open) setVisibility(readVisibility());
			}}
		>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-8">
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
							checked={visibility[column.id] ?? true}
							onCheckedChange={(value) => toggle(column.id, !!value)}
							onSelect={(event) => event.preventDefault()}
						>
							{label}
						</DropdownMenuCheckboxItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
