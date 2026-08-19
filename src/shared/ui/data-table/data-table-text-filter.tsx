import { IconFilter, IconFilterFilled, IconX } from "@tabler/icons-react";
import type { RowData } from "@tanstack/react-table";
import type { AppColumn } from "./table-features";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

interface DataTableTextFilterProps<TData extends RowData, TValue> {
	column: AppColumn<TData, TValue>;
	placeholder?: string;
}

export function DataTableTextFilter<TData extends RowData, TValue>({
	column,
	placeholder = "Search...",
}: DataTableTextFilterProps<TData, TValue>) {
	const value = (column?.getFilterValue() as string | undefined) ?? "";
	const hasFilter = !!value;

	const handleChange = (newValue: string) => {
		column?.setFilterValue(newValue || undefined);
	};

	const handleClear = () => {
		column?.setFilterValue(undefined);
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					className={cn("size-6 shrink-0", hasFilter && "text-primary")}
				>
					{hasFilter ? (
						<IconFilterFilled className="size-3.5" />
					) : (
						<IconFilter className="size-3.5" />
					)}
					<span className="sr-only">Filter</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-56 p-2" align="start">
				<div className="flex items-center gap-2">
					<Input
						placeholder={placeholder}
						value={value}
						onChange={(e) => handleChange(e.target.value)}
						className="h-8"
					/>
					{hasFilter && (
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleClear}
							className="size-8 shrink-0"
						>
							<IconX className="size-4" />
							<span className="sr-only">Clear</span>
						</Button>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
