import { IconFilter, IconFilterFilled } from "@tabler/icons-react";
import type { RowData } from "@tanstack/react-table";
import type { AppColumn } from "./table-features";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Separator } from "@/shared/ui/separator";

export interface FilterOption {
	label: string;
	value: string;
}

interface DataTableColumnFilterProps<TData extends RowData, TValue> {
	column: AppColumn<TData, TValue>;
	options: FilterOption[];
}

export function DataTableColumnFilter<TData extends RowData, TValue>({
	column,
	options,
}: DataTableColumnFilterProps<TData, TValue>) {
	const facets = column?.getFacetedUniqueValues();
	const readSelection = () =>
		new Set((column?.getFilterValue() as string[] | undefined) ?? []);

	// The popover lives in a portal and does not re-render from the table's
	// filter-state change while open, so the checkboxes would only reflect a
	// toggle after reopening (and the toggle closure would freeze, blocking
	// deselect). We keep a local mirror of the selection (drives the checkboxes,
	// re-renders immediately) and re-sync it from the column whenever the popover
	// opens (so an external Reset stays consistent). Same pattern as
	// SubmissionsColumnHeader.
	const [selectedValues, setSelectedValues] =
		useState<Set<string>>(readSelection);

	const hasFilters = selectedValues.size > 0;

	const apply = (next: Set<string>) => {
		setSelectedValues(next);
		column?.setFilterValue(next.size ? Array.from(next) : undefined);
	};

	const handleSelect = (value: string) => {
		const next = new Set(selectedValues);
		if (next.has(value)) {
			next.delete(value);
		} else {
			next.add(value);
		}
		apply(next);
	};

	const handleClear = () => {
		apply(new Set());
	};

	const handleSelectAll = () => {
		apply(new Set(options.map((o) => o.value)));
	};

	return (
		<Popover
			onOpenChange={(open) => {
				if (open) setSelectedValues(readSelection());
			}}
		>
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
				<div className="max-h-64 overflow-auto fade p-2">
					<div className="space-y-2">
						{options.map((option) => {
							const isSelected = selectedValues.has(option.value);
							const count = facets?.get(option.value) ?? 0;

							return (
								// The visible control is a Radix Checkbox (a <button>): a nested <button> breaks
								// hydration and double-toggles. The row carries role/aria-checked and keyboard
								// handling instead.
								<div
									key={option.value}
									role="checkbox"
									aria-checked={isSelected}
									tabIndex={0}
									className="flex w-full cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50"
									onClick={() => handleSelect(option.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											handleSelect(option.value);
										}
									}}
								>
									<Checkbox
										checked={isSelected}
										tabIndex={-1}
										aria-hidden
										className="pointer-events-none"
									/>
									<span className="flex-1 text-left text-sm">
										{option.label}
									</span>
									<span className="text-xs text-muted-foreground tabular-nums">
										{count}
									</span>
								</div>
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
