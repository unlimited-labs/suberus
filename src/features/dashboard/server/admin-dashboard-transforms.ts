import { differenceInCalendarDays } from "date-fns";

export const TREND_DAYS = 14;

function dayIndex(date: Date, windowStart: Date): number {
	// differenceInCalendarDays is DST-safe (counts calendar boundaries, not 24h spans).
	const idx = differenceInCalendarDays(date, windowStart);
	return Math.min(Math.max(idx, 0), TREND_DAYS - 1);
}

export function bucketCounts(dates: Date[], windowStart: Date): number[] {
	const buckets = new Array<number>(TREND_DAYS).fill(0);
	for (const date of dates) {
		buckets[dayIndex(date, windowStart)] += 1;
	}
	return buckets;
}

export function bucketSums(
	rows: Array<{ date: Date; amount: number }>,
	windowStart: Date,
): number[] {
	const buckets = new Array<number>(TREND_DAYS).fill(0);
	for (const row of rows) {
		buckets[dayIndex(row.date, windowStart)] += row.amount;
	}
	return buckets;
}

export function tallyGroups<G extends { _count: number }, K extends string>(
	base: Record<K, number>,
	groups: G[],
	keyOf: (group: G) => K,
) {
	const result = { ...base };
	for (const group of groups) {
		result[keyOf(group)] = group._count;
	}
	return result;
}

export function formatPersonName(
	person: { firstName: string | null; lastName: string | null } | null,
): string | null {
	if (!person) return null;
	return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || null;
}

export function completionRate(completed: number, total: number): number {
	return total > 0 ? (completed / total) * 100 : 0;
}

export function sumFeeAmounts(fees: Array<{ amount: unknown }>): number {
	return fees.reduce<number>(
		(sum, fee) => sum + (fee.amount ? Number(fee.amount) : 0),
		0,
	);
}
