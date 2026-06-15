import { describe, expect, it } from "vitest";
import {
	bucketCounts,
	bucketSums,
	completionRate,
	formatPersonName,
	sumFeeAmounts,
	TREND_DAYS,
	tallyGroups,
} from "./admin-dashboard-transforms";

const windowStart = new Date("2026-06-01T00:00:00Z");

describe("bucketCounts", () => {
	it("counts dates into per-day buckets", () => {
		const result = bucketCounts(
			[
				new Date("2026-06-01T10:00:00Z"),
				new Date("2026-06-01T20:00:00Z"),
				new Date("2026-06-03T00:00:00Z"),
			],
			windowStart,
		);
		expect(result).toHaveLength(TREND_DAYS);
		expect(result[0]).toBe(2);
		expect(result[2]).toBe(1);
		expect(result[1]).toBe(0);
	});

	it("clamps dates before the window into bucket 0 and after into the last", () => {
		const result = bucketCounts(
			[new Date("2026-05-20T00:00:00Z"), new Date("2026-09-01T00:00:00Z")],
			windowStart,
		);
		expect(result[0]).toBe(1);
		expect(result[TREND_DAYS - 1]).toBe(1);
	});
});

describe("bucketSums", () => {
	it("sums amounts into per-day buckets", () => {
		const result = bucketSums(
			[
				{ date: new Date("2026-06-01T10:00:00Z"), amount: 10 },
				{ date: new Date("2026-06-01T11:00:00Z"), amount: 5 },
				{ date: new Date("2026-06-02T00:00:00Z"), amount: 7 },
			],
			windowStart,
		);
		expect(result[0]).toBe(15);
		expect(result[1]).toBe(7);
	});
});

describe("tallyGroups", () => {
	it("projects grouped counts over a fixed key set", () => {
		const groups = [
			{ role: "ADMIN", _count: 2 },
			{ role: "AUTHOR", _count: 5 },
		];
		expect(
			tallyGroups({ ADMIN: 0, AUTHOR: 0, REVIEWER: 0 }, groups, (g) => g.role),
		).toEqual({ ADMIN: 2, AUTHOR: 5, REVIEWER: 0 });
	});

	it("does not mutate the base record", () => {
		const base = { A: 0, B: 0 };
		tallyGroups(base, [{ k: "A", _count: 3 }], (g) => g.k);
		expect(base).toEqual({ A: 0, B: 0 });
	});
});

describe("formatPersonName", () => {
	it("joins first and last, trimmed", () => {
		expect(formatPersonName({ firstName: "Ada", lastName: "Lovelace" })).toBe(
			"Ada Lovelace",
		);
	});

	it("returns null for a null person or fully empty name", () => {
		expect(formatPersonName(null)).toBeNull();
		expect(formatPersonName({ firstName: null, lastName: null })).toBeNull();
	});

	it("handles a single present name part", () => {
		expect(formatPersonName({ firstName: "Ada", lastName: null })).toBe("Ada");
		expect(formatPersonName({ firstName: null, lastName: "Lovelace" })).toBe(
			"Lovelace",
		);
	});
});

describe("completionRate", () => {
	it("computes a percentage", () => {
		expect(completionRate(3, 4)).toBe(75);
	});

	it("returns 0 when nothing is assigned", () => {
		expect(completionRate(0, 0)).toBe(0);
	});
});

describe("sumFeeAmounts", () => {
	it("sums numeric amounts", () => {
		expect(sumFeeAmounts([{ amount: 10 }, { amount: 5.5 }])).toBe(15.5);
	});

	it("treats null/zero amounts as 0", () => {
		expect(
			sumFeeAmounts([{ amount: null }, { amount: 0 }, { amount: 3 }]),
		).toBe(3);
	});

	it("coerces Decimal-like values via Number()", () => {
		expect(sumFeeAmounts([{ amount: "12.50" }, { amount: "7.50" }])).toBe(20);
	});
});
