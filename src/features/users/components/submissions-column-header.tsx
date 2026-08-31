import {
	IconArrowDown,
	IconArrowUp,
	IconEyeOff,
	IconFilter,
	IconFilterFilled,
	IconSelector,
} from "@tabler/icons-react";
import { useState } from "react";
import {
	submissionDraftFilterOptions,
	submissionRoleFilterOptions,
} from "@/features/users/labels";
import type { AdminUser } from "@/features/users/server/users";
import { typeFilterOptions } from "@/shared/lib/labels/submission";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import type {
	AppColumn,
	AppCoreTable,
} from "@/shared/ui/data-table/table-features";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Separator } from "@/shared/ui/separator";

interface FilterSectionProps {
	title: string;
	options: ReadonlyArray<{ label: string; value: string }>;
	facets: Map<string, number> | undefined;
	selected: string[];
	onToggle: (value: string) => void;
}

function FilterSection({
	title,
	options,
	facets,
	selected,
	onToggle,
}: FilterSectionProps) {
	const selectedSet = new Set(selected);
	return (
		<div className="p-2">
			<span className="text-muted-foreground text-xs font-medium">{title}</span>
			<div className="mt-1 space-y-1">
				{options.map((option) => {
					const isSelected = selectedSet.has(option.value);
					const count = facets?.get(option.value) ?? 0;
					return (
						// The visible control is a Radix Checkbox (a <button>): it cannot nest in a native
						// <input>, and a nested <button> double-toggled. The row carries role/aria-checked
						// and keyboard handling instead.
						<div
							aria-checked={isSelected}
							className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-2 rounded px-1 py-0.5"
							data-testid={`submission-filter-${option.value}`}
							key={option.value}
							onClick={() => onToggle(option.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onToggle(option.value);
								}
							}}
							role="checkbox"
							tabIndex={0}
						>
							<Checkbox
								aria-hidden
								checked={isSelected}
								className="pointer-events-none"
								tabIndex={-1}
							/>
							<span className="flex-1 text-left text-sm">{option.label}</span>
							<span className="text-muted-foreground text-xs tabular-nums">
								{count}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

interface SubmissionsColumnHeaderProps {
	column: AppColumn<AdminUser, unknown>;
	table: AppCoreTable<AdminUser>;
}

type Dimension = "type" | "role" | "draft";

export function SubmissionsColumnHeader({
	column,
	table,
}: SubmissionsColumnHeaderProps) {
	const columns = {
		type: table.getColumn("submissionType"),
		role: table.getColumn("submissionRole"),
		draft: table.getColumn("submissionDraft"),
	} satisfies Record<Dimension, AppColumn<AdminUser, unknown> | undefined>;

	const readSelection = () => ({
		// SAFETY: this column's filter is set only with string arrays.
		type: (columns.type?.getFilterValue() as string[] | undefined) ?? [],
		// SAFETY: this column's filter is set only with string arrays.
		role: (columns.role?.getFilterValue() as string[] | undefined) ?? [],
		// SAFETY: this column's filter is set only with string arrays.
		draft: (columns.draft?.getFilterValue() as string[] | undefined) ?? [],
	});

	// Popover is portaled and won't re-render with the table — mirror selection locally.
	const [selection, setSelection] =
		useState<Record<Dimension, string[]>>(readSelection);

	const activeCount =
		selection.type.length + selection.role.length + selection.draft.length;
	const hasFilters = activeCount > 0;

	const toggle = (dimension: Dimension, value: string) => {
		const next = new Set(selection[dimension]);
		if (next.has(value)) {
			next.delete(value);
		} else {
			next.add(value);
		}
		const values = Array.from(next);
		columns[dimension]?.setFilterValue(values.length ? values : undefined);
		setSelection({ ...selection, [dimension]: values });
	};

	const clearAll = () => {
		columns.type?.setFilterValue(undefined);
		columns.role?.setFilterValue(undefined);
		columns.draft?.setFilterValue(undefined);
		setSelection({ type: [], role: [], draft: [] });
	};

	return (
		<div className="flex items-center gap-1">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className="data-open:bg-accent -ml-3 h-8"
						size="sm"
						variant="ghost"
					>
						<span>Submissions</span>
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
						<IconArrowUp className="text-muted-foreground/70 mr-2 size-3.5" />
						Ascending
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => column.toggleSorting(true)}>
						<IconArrowDown className="text-muted-foreground/70 mr-2 size-3.5" />
						Descending
					</DropdownMenuItem>
					{column.getCanHide() && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
								<IconEyeOff className="text-muted-foreground/70 mr-2 size-3.5" />
								Hide
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<Popover
				onOpenChange={(open) => {
					if (open) setSelection(readSelection());
				}}
			>
				<PopoverTrigger asChild>
					<Button
						className={cn("size-6 shrink-0", hasFilters && "text-primary")}
						data-testid="submissions-filter-trigger"
						size="icon-sm"
						variant="ghost"
					>
						{hasFilters ? (
							<IconFilterFilled className="size-3.5" />
						) : (
							<IconFilter className="size-3.5" />
						)}
						<span className="sr-only">Filter submissions</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-56 p-0">
					<div className="flex items-center justify-between p-2">
						<span className="text-sm font-medium">Filter</span>
						{hasFilters && (
							<Badge className="text-xs" variant="secondary">
								{activeCount}
							</Badge>
						)}
					</div>
					<Separator />
					<div className="max-h-80 overflow-auto">
						<FilterSection
							facets={columns.type?.getFacetedUniqueValues()}
							onToggle={(v) => toggle("type", v)}
							options={typeFilterOptions}
							selected={selection.type}
							title="Type"
						/>
						<Separator />
						<FilterSection
							facets={columns.role?.getFacetedUniqueValues()}
							onToggle={(v) => toggle("role", v)}
							options={submissionRoleFilterOptions}
							selected={selection.role}
							title="Role"
						/>
						<Separator />
						<FilterSection
							facets={columns.draft?.getFacetedUniqueValues()}
							onToggle={(v) => toggle("draft", v)}
							options={submissionDraftFilterOptions}
							selected={selection.draft}
							title="Status"
						/>
					</div>
					<Separator />
					<div className="flex justify-end p-2">
						<Button
							className="h-7 text-xs"
							disabled={!hasFilters}
							onClick={clearAll}
							size="sm"
							variant="ghost"
						>
							Clear
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
