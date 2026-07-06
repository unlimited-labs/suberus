import type { ExpenseFilter, ExpenseSort } from "@/features/finances/calc";
import { formatCurrency } from "@/shared/lib/format-currency";
import { cn } from "@/shared/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface StatBucket {
	count: number;
	sum: number;
}

const CHIPS: Array<{
	key: ExpenseFilter;
	label: string;
	activeClass: string;
}> = [
	{ key: "all", label: "All", activeClass: "bg-foreground text-background" },
	{ key: "unpaid", label: "Unpaid", activeClass: "bg-amber-500 text-white" },
	{
		key: "overdue",
		label: "Overdue",
		activeClass: "bg-destructive text-white",
	},
	{ key: "paid", label: "Paid", activeClass: "bg-emerald-600 text-white" },
];

export function ExpenseToolbar({
	stats,
	filter,
	onFilter,
	sort,
	onSort,
	currency,
}: {
	stats: Record<ExpenseFilter, StatBucket>;
	filter: ExpenseFilter;
	onFilter: (filter: ExpenseFilter) => void;
	sort: ExpenseSort;
	onSort: (sort: ExpenseSort) => void;
	currency: string;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{CHIPS.map(({ key, label, activeClass }) => (
				<button
					key={key}
					type="button"
					onClick={() => onFilter(key)}
					data-testid={`expense-filter-${key}`}
					className={cn(
						"rounded-md border px-2.5 py-1 text-xs transition-colors",
						filter === key
							? `border-transparent ${activeClass}`
							: "border-border text-muted-foreground hover:bg-muted",
					)}
				>
					{label}{" "}
					<span className="font-medium tabular-nums">{stats[key].count}</span>
					{stats[key].sum
						? ` · ${formatCurrency(stats[key].sum, currency)}`
						: ""}
				</button>
			))}
			<div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
				Sort
				<Select
					items={[
						{ value: "manual", label: "Manual" },
						{ value: "due", label: "Due date" },
						{ value: "amount", label: "Amount" },
						{ value: "name", label: "Name" },
					]}
					value={sort}
					onValueChange={(v) => onSort(v as ExpenseSort)}
				>
					<SelectTrigger className="w-32" data-testid="expense-sort">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="manual">Manual</SelectItem>
						<SelectItem value="due">Due date</SelectItem>
						<SelectItem value="amount">Amount</SelectItem>
						<SelectItem value="name">Name</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
