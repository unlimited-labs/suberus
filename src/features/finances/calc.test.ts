import { describe, expect, it } from "vitest";
import {
	breakEvenUnits,
	evalAmount,
	grossAmount,
	netAmount,
	projectFeeIncome,
	sumGross,
	sumNet,
	sumRows,
} from "@/features/finances/calc";

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
