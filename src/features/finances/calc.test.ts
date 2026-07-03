import { describe, expect, it } from "vitest";
import {
	breakEvenUnits,
	dueStatus,
	evalAmount,
	expenseStats,
	type FinanceRow,
	grossAmount,
	matchesExpenseFilter,
	netAmount,
	projectFeeIncome,
	sortExpenses,
	sumGross,
	sumNet,
	sumRows,
} from "@/features/finances/calc";

const row = (over: Partial<FinanceRow>): FinanceRow => ({
	label: "x",
	amountExpr: "0",
	...over,
});

describe("evalAmount", () => {
	it("evaluates arithmetic expressions", () => {
		expect(evalAmount("2*250")).toBe(500);
		expect(evalAmount("(100+20)*3")).toBe(360);
		expect(evalAmount("500")).toBe(500);
	});

	it("is 0 for empty, invalid, or negative input", () => {
		expect(evalAmount("")).toBe(0);
		expect(evalAmount("  ")).toBe(0);
		expect(evalAmount("2*")).toBe(0);
		expect(evalAmount("abc")).toBe(0);
		expect(evalAmount("-5")).toBe(0);
	});
});

describe("sumRows", () => {
	it("sums evaluated expressions", () => {
		expect(
			sumRows([
				{ label: "a", amountExpr: "100" },
				{ label: "b", amountExpr: "2*125.25" },
			]),
		).toBe(350.5);
	});

	it("is 0 for an empty ledger", () => {
		expect(sumRows([])).toBe(0);
	});
});

describe("VAT gross/net conversion", () => {
	it("net → gross adds VAT; gross stays gross", () => {
		expect(
			grossAmount({
				label: "a",
				amountExpr: "100",
				vatRate: 23,
				amountIsGross: false,
			}),
		).toBe(123);
		expect(
			grossAmount({
				label: "a",
				amountExpr: "123",
				vatRate: 23,
				amountIsGross: true,
			}),
		).toBe(123);
	});

	it("gross → net removes VAT; net stays net", () => {
		expect(
			netAmount({
				label: "a",
				amountExpr: "108",
				vatRate: 8,
				amountIsGross: true,
			}),
		).toBe(100);
		expect(
			netAmount({
				label: "a",
				amountExpr: "100",
				vatRate: 8,
				amountIsGross: false,
			}),
		).toBe(100);
	});

	it("no VAT rate leaves the amount untouched", () => {
		expect(grossAmount({ label: "a", amountExpr: "50" })).toBe(50);
		expect(netAmount({ label: "a", amountExpr: "50", vatRate: 0 })).toBe(50);
	});

	it("sumGross and sumNet total across mixed rows", () => {
		const rows = [
			{ label: "a", amountExpr: "100", vatRate: 23, amountIsGross: false },
			{ label: "b", amountExpr: "50", amountIsGross: true },
		];
		expect(sumGross(rows)).toBe(173);
		expect(sumNet(rows)).toBe(150);
	});
});

describe("projectFeeIncome", () => {
	it("multiplies price by qty per row and sums", () => {
		expect(
			projectFeeIncome([
				{ price: 250, qty: 80 },
				{ price: 100, qty: 40 },
			]),
		).toBe(24000);
	});
});

describe("breakEvenUnits", () => {
	it("returns units needed to cover the shortfall, rounded up", () => {
		expect(breakEvenUnits(27900, 15000, 250)).toBe(52);
	});

	it("returns 0 when income already covers expenses", () => {
		expect(breakEvenUnits(1000, 1000, 250)).toBe(0);
		expect(breakEvenUnits(1000, 2000, 250)).toBe(0);
	});

	it("returns null when the price cannot close the gap", () => {
		expect(breakEvenUnits(1000, 0, 0)).toBeNull();
		expect(breakEvenUnits(1000, 0, -5)).toBeNull();
	});
});

describe("dueStatus", () => {
	const today = "2026-07-03";

	it("has no status without a due date", () => {
		expect(dueStatus("", today, false)).toEqual({ overdue: false, days: null });
	});

	it("flags a past due date only when unpaid", () => {
		expect(dueStatus("2026-07-01", today, false)).toEqual({
			overdue: true,
			days: -2,
		});
		expect(dueStatus("2026-07-01", today, true).overdue).toBe(false);
	});

	it("reports positive days for upcoming dates and 0 for today", () => {
		expect(dueStatus("2026-07-06", today, false).days).toBe(3);
		expect(dueStatus(today, today, false)).toEqual({ overdue: false, days: 0 });
	});
});

describe("matchesExpenseFilter", () => {
	const today = "2026-07-03";
	const paid = row({ paid: true });
	const unpaidOverdue = row({ dueDate: "2026-07-01" });
	const unpaidFuture = row({ dueDate: "2026-07-10" });

	it("all matches everything", () => {
		expect(matchesExpenseFilter(paid, "all", today)).toBe(true);
		expect(matchesExpenseFilter(unpaidOverdue, "all", today)).toBe(true);
	});

	it("paid / unpaid split on the paid flag", () => {
		expect(matchesExpenseFilter(paid, "paid", today)).toBe(true);
		expect(matchesExpenseFilter(unpaidFuture, "paid", today)).toBe(false);
		expect(matchesExpenseFilter(unpaidFuture, "unpaid", today)).toBe(true);
	});

	it("overdue matches only past-due unpaid rows", () => {
		expect(matchesExpenseFilter(unpaidOverdue, "overdue", today)).toBe(true);
		expect(matchesExpenseFilter(unpaidFuture, "overdue", today)).toBe(false);
		expect(
			matchesExpenseFilter(
				row({ dueDate: "2026-07-01", paid: true }),
				"overdue",
				today,
			),
		).toBe(false);
	});
});

describe("expenseStats", () => {
	it("buckets counts and gross sums by status", () => {
		const today = "2026-07-03";
		const stats = expenseStats(
			[
				row({ amountExpr: "100", paid: true }),
				row({ amountExpr: "200", dueDate: "2026-07-01" }),
				row({ amountExpr: "50", dueDate: "2026-07-10" }),
			],
			today,
		);
		expect(stats.all).toEqual({ count: 3, sum: 350 });
		expect(stats.paid).toEqual({ count: 1, sum: 100 });
		expect(stats.unpaid).toEqual({ count: 2, sum: 250 });
		expect(stats.overdue).toEqual({ count: 1, sum: 200 });
	});
});

describe("sortExpenses", () => {
	const rows = [
		row({ label: "B", amountExpr: "100", dueDate: "2026-08-01" }),
		row({ label: "A", amountExpr: "300", dueDate: "2026-07-01" }),
	];

	it("keeps order for manual and does not mutate input", () => {
		expect(sortExpenses(rows, "manual")).toBe(rows);
		sortExpenses(rows, "amount");
		expect(rows[0].label).toBe("B");
	});

	it("sorts by amount desc, name asc, and due asc", () => {
		expect(sortExpenses(rows, "amount").map((r) => r.label)).toEqual([
			"A",
			"B",
		]);
		expect(sortExpenses(rows, "name").map((r) => r.label)).toEqual(["A", "B"]);
		expect(sortExpenses(rows, "due").map((r) => r.label)).toEqual(["A", "B"]);
	});
});
