import {
	IconArrowDown,
	IconArrowUp,
	IconEyeOff,
	IconSelector,
} from "@tabler/icons-react";
import type { Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import {
	DataTableColumnFilter,
	type FilterOption,
} from "./data-table-column-filter";
import { DataTableTextFilter } from "./data-table-text-filter";

interface DataTableColumnHeaderProps<TData, TValue>
	extends React.HTMLAttributes<HTMLDivElement> {
	column: Column<TData, TValue>;
	title: string;
	filterOptions?: FilterOption[];
	textFilter?: boolean | { placeholder?: string };
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	className,
	filterOptions,
	textFilter,
}: DataTableColumnHeaderProps<TData, TValue>) {
	const textFilterPlaceholder =
		typeof textFilter === "object" ? textFilter.placeholder : undefined;

	const renderFilter = () => {
		if (filterOptions) {
			return <DataTableColumnFilter column={column} options={filterOptions} />;
		}
		if (textFilter) {
			return (
				<DataTableTextFilter
					column={column}
					placeholder={textFilterPlaceholder}
				/>
			);
		}
		return null;
	};

	if (!column.getCanSort()) {
		return (
			<div className={cn("flex items-center gap-1", className)}>
				<span>{title}</span>
				{renderFilter()}
			</div>
		);
	}

	return (
		<div className={cn("flex items-center gap-1", className)}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="-ml-3 h-8 data-open:bg-accent"
					>
						<span>{title}</span>
						{column.getIsSorted() === "desc" ? (
							<IconArrowDown className="ml-2 size-4" />
						) : column.getIsSorted() === "asc" ? (
							<IconArrowUp className="ml-2 size-4" />
						) : (
							<IconSelector className="ml-2 size-4" />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onClick={() => column.toggleSorting(false)}>
						<IconArrowUp className="mr-2 size-3.5 text-muted-foreground/70" />
						Ascending
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => column.toggleSorting(true)}>
						<IconArrowDown className="mr-2 size-3.5 text-muted-foreground/70" />
						Descending
					</DropdownMenuItem>
					{column.getCanHide() && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
								<IconEyeOff className="mr-2 size-3.5 text-muted-foreground/70" />
								Hide
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{renderFilter()}
		</div>
	);
}
