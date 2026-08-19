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
			<span className="text-xs font-medium text-muted-foreground">{title}</span>
			<div className="mt-1 space-y-1">
				{options.map((option) => {
					const isSelected = selectedSet.has(option.value);
					const count = facets?.get(option.value) ?? 0;
					return (
						// biome-ignore lint/a11y/useSemanticElements: the visible control is a Radix Checkbox (a <button>); nesting it in a native <input> isn't possible and a nested <button> caused double-toggle. This row carries role/aria-checked + keyboard handling instead.
						<div
							key={option.value}
							role="checkbox"
							aria-checked={isSelected}
							tabIndex={0}
							data-testid={`submission-filter-${option.value}`}
							className="flex w-full cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50"
							onClick={() => onToggle(option.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onToggle(option.value);
								}
							}}
						>
							<Checkbox
								checked={isSelected}
								tabIndex={-1}
								aria-hidden
								className="pointer-events-none"
							/>
							<span className="flex-1 text-left text-sm">{option.label}</span>
							<span className="text-xs text-muted-foreground tabular-nums">
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
	const columns: Record<Dimension, AppColumn<AdminUser, unknown> | undefined> =
		{
			type: table.getColumn("submissionType"),
			role: table.getColumn("submissionRole"),
			draft: table.getColumn("submissionDraft"),
		};

	const readSelection = (): Record<Dimension, string[]> => ({
		type: (columns.type?.getFilterValue() as string[] | undefined) ?? [],
		role: (columns.role?.getFilterValue() as string[] | undefined) ?? [],
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
						variant="ghost"
						size="sm"
						className="-ml-3 h-8 data-open:bg-accent"
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

			<Popover
				onOpenChange={(open) => {
					// Re-sync with current filter state on open
					if (open) setSelection(readSelection());
				}}
			>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						data-testid="submissions-filter-trigger"
						className={cn("size-6 shrink-0", hasFilters && "text-primary")}
					>
						{hasFilters ? (
							<IconFilterFilled className="size-3.5" />
						) : (
							<IconFilter className="size-3.5" />
						)}
						<span className="sr-only">Filter submissions</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-56 p-0" align="start">
					<div className="flex items-center justify-between p-2">
						<span className="text-sm font-medium">Filter</span>
						{hasFilters && (
							<Badge variant="secondary" className="text-xs">
								{activeCount}
							</Badge>
						)}
					</div>
					<Separator />
					<div className="max-h-80 overflow-auto">
						<FilterSection
							title="Type"
							options={typeFilterOptions}
							facets={columns.type?.getFacetedUniqueValues()}
							selected={selection.type}
							onToggle={(v) => toggle("type", v)}
						/>
						<Separator />
						<FilterSection
							title="Role"
							options={submissionRoleFilterOptions}
							facets={columns.role?.getFacetedUniqueValues()}
							selected={selection.role}
							onToggle={(v) => toggle("role", v)}
						/>
						<Separator />
						<FilterSection
							title="Status"
							options={submissionDraftFilterOptions}
							facets={columns.draft?.getFacetedUniqueValues()}
							selected={selection.draft}
							onToggle={(v) => toggle("draft", v)}
						/>
					</div>
					<Separator />
					<div className="flex justify-end p-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={clearAll}
							disabled={!hasFilters}
							className="h-7 text-xs"
						>
							Clear
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
