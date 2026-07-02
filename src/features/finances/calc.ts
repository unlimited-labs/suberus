import { Parser } from "expr-eval";

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

export function sumRows(rows: FinanceRow[]): number {
	return rows.reduce((sum, row) => sum + evalAmount(row.amountExpr), 0);
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
