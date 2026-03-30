import { IconFilter, IconFilterFilled } from "@tabler/icons-react";
import type { Column } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface FilterOption {
	label: string;
	value: string;
}

interface DataTableColumnFilterProps<TData, TValue> {
	column: Column<TData, TValue>;
	options: FilterOption[];
}

export function DataTableColumnFilter<TData, TValue>({
	column,
	options,
}: DataTableColumnFilterProps<TData, TValue>) {
	const facets = column?.getFacetedUniqueValues();
	const columnFilterValue = column?.getFilterValue() as string[] | undefined;
	const selectedValues = new Set(columnFilterValue ?? []);
	const hasFilters = selectedValues.size > 0;

	const handleSelect = (value: string) => {
		const next = new Set(selectedValues);
		if (next.has(value)) {
			next.delete(value);
		} else {
			next.add(value);
		}
		const filterValues = Array.from(next);
		column?.setFilterValue(filterValues.length ? filterValues : undefined);
	};

	const handleClear = () => {
		column?.setFilterValue(undefined);
	};

	const handleSelectAll = () => {
		column?.setFilterValue(options.map((o) => o.value));
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					className={cn("size-6 shrink-0", hasFilters && "text-primary")}
				>
					{hasFilters ? (
						<IconFilterFilled className="size-3.5" />
					) : (
						<IconFilter className="size-3.5" />
					)}
					<span className="sr-only">Filter</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-56 p-0" align="start">
				<div className="p-2">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Filter</span>
						{hasFilters && (
							<Badge variant="secondary" className="text-xs">
								{selectedValues.size}
							</Badge>
						)}
					</div>
				</div>
				<Separator />
				<div className="max-h-64 overflow-auto p-2">
					<div className="space-y-2">
						{options.map((option) => {
							const isSelected = selectedValues.has(option.value);
							const count = facets?.get(option.value) ?? 0;

							return (
								<button
									type="button"
									key={option.value}
									className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50"
									onClick={() => handleSelect(option.value)}
								>
									<Checkbox
										checked={isSelected}
										onCheckedChange={() => handleSelect(option.value)}
									/>
									<span className="flex-1 text-left text-sm">
										{option.label}
									</span>
									<span className="text-xs text-muted-foreground tabular-nums">
										{count}
									</span>
								</button>
							);
						})}
					</div>
				</div>
				<Separator />
				<div className="flex items-center justify-between p-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClear}
						disabled={!hasFilters}
						className="h-7 text-xs"
					>
						Clear
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleSelectAll}
						className="h-7 text-xs"
					>
						Select all
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
