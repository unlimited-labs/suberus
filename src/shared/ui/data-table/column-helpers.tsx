import { IconDotsVertical, IconEdit, IconEye } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export function createSelectColumn<T>(): ColumnDef<T> {
	return {
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={table.getIsAllPageRowsSelected()}
				indeterminate={table.getIsSomePageRowsSelected()}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	};
}

interface ActionLink {
	to: string;
	params: Record<string, string>;
}

interface ActionsColumnConfig<T> {
	getViewLink: (row: T) => ActionLink;
	getEditLink?: (row: T) => ActionLink;
}

export function createActionsColumn<T>(
	config: ActionsColumnConfig<T>,
): ColumnDef<T> {
	return {
		id: "actions",
		cell: ({ row }) => {
			const viewLink = config.getViewLink(row.original);
			const editLink = config.getEditLink?.(row.original);

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon-sm">
							<IconDotsVertical className="size-4" />
							<span className="sr-only">Actions menu</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link to={viewLink.to} params={viewLink.params}>
								<IconEye className="mr-2 size-4" />
								View
							</Link>
						</DropdownMenuItem>
						{editLink && (
							<DropdownMenuItem asChild>
								<Link to={editLink.to} params={editLink.params}>
									<IconEdit className="mr-2 size-4" />
									Edit
								</Link>
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	};
}

export const facetedFilterFn = <T,>(
	row: Row<T>,
	columnId: string,
	filterValue: string[],
) => {
	return filterValue.includes(row.getValue(columnId));
};
