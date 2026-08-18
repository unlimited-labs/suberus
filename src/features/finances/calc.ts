import { Parser } from "expr-eval-fork";

export interface FinanceRow {
	label: string;
	amountExpr: string;
	contractor?: string | null;
	vatRate?: number | null;
	amountIsGross?: boolean;
	dueDate?: string;
	paid?: boolean;
	ordered?: boolean;
}

export function evalAmount(expr: string): number {
	const trimmed = (expr ?? "").trim();
	if (trimmed === "") return 0;
	try {
		const value = Parser.evaluate(trimmed);
		return typeof value === "number" && Number.isFinite(value) && value >= 0
			? value
			: 0;
	} catch {
		return 0;
	}
}

export function grossAmount(row: FinanceRow): number {
	const amount = evalAmount(row.amountExpr);
	if (!row.vatRate) return amount;
	return row.amountIsGross === false
		? amount * (1 + row.vatRate / 100)
		: amount;
}

export function netAmount(row: FinanceRow): number {
	const amount = evalAmount(row.amountExpr);
	if (!row.vatRate) return amount;
	return row.amountIsGross === false
		? amount
		: amount / (1 + row.vatRate / 100);
}

export function sumGross(rows: FinanceRow[]): number {
	return rows.reduce((sum, row) => sum + grossAmount(row), 0);
}

export function sumNet(rows: FinanceRow[]): number {
	return rows.reduce((sum, row) => sum + netAmount(row), 0);
}

export interface FeeProjectionRow {
	price: number;
	qty: number;
}

export function projectFeeIncome(rows: FeeProjectionRow[]): number {
	return rows.reduce((sum, row) => {
		const price = Number.isFinite(row.price) ? row.price : 0;
		const qty = Number.isFinite(row.qty) ? row.qty : 0;
		return sum + price * qty;
	}, 0);
}

// null = price ≤ 0, gap can never be closed; 0 = no shortfall.
export function breakEvenUnits(
	expenses: number,
	otherIncome: number,
	price: number,
): number | null {
	if (price <= 0) return null;
	const shortfall = expenses - otherIncome;
	if (shortfall <= 0) return 0;
	return Math.ceil(shortfall / price);
}

export type ExpenseSort = "manual" | "due" | "amount" | "name";
export type ExpenseFilter = "all" | "unpaid" | "overdue" | "paid";

const DAY_MS = 86_400_000;

export function dueStatus(
	dueDate: string | null | undefined,
	today: string,
	paid: boolean,
): { overdue: boolean; days: number | null } {
	if (!dueDate) return { overdue: false, days: null };
	const days = Math.round((Date.parse(dueDate) - Date.parse(today)) / DAY_MS);
	return { overdue: dueDate < today && !paid, days };
}

export function matchesExpenseFilter(
	row: FinanceRow,
	filter: ExpenseFilter,
	today: string,
): boolean {
	const paid = !!row.paid;
	if (filter === "paid") return paid;
	if (filter === "unpaid") return !paid;
	if (filter === "overdue")
		return !paid && !!row.dueDate && row.dueDate < today;
	return true;
}

interface StatBucket {
	count: number;
	sum: number;
}

export function expenseStats(
	rows: FinanceRow[],
	today: string,
): Record<"all" | "unpaid" | "overdue" | "paid", StatBucket> {
	const stats = {
		all: { count: 0, sum: 0 },
		unpaid: { count: 0, sum: 0 },
		overdue: { count: 0, sum: 0 },
		paid: { count: 0, sum: 0 },
	};
	for (const row of rows) {
		const gross = grossAmount(row);
		stats.all.count++;
		stats.all.sum += gross;
		if (row.paid) {
			stats.paid.count++;
			stats.paid.sum += gross;
		} else {
			stats.unpaid.count++;
			stats.unpaid.sum += gross;
			if (row.dueDate && row.dueDate < today) {
				stats.overdue.count++;
				stats.overdue.sum += gross;
			}
		}
	}
	return stats;
}

export function sortExpenses<T extends FinanceRow>(
	rows: T[],
	sort: ExpenseSort,
): T[] {
	if (sort === "manual") return rows;
	return rows.toSorted((a, b) => {
		if (sort === "due")
			return (a.dueDate || "9999-99-99").localeCompare(
				b.dueDate || "9999-99-99",
			);
		if (sort === "amount") return grossAmount(b) - grossAmount(a);
		return a.label.localeCompare(b.label);
	});
}
