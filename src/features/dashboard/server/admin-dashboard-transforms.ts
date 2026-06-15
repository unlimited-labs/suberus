import { differenceInCalendarDays } from "date-fns";

export const TREND_DAYS = 14;

function dayIndex(date: Date, windowStart: Date): number {
	// differenceInCalendarDays is DST-safe (counts calendar boundaries, not 24h spans).
	const idx = differenceInCalendarDays(date, windowStart);
	return Math.min(Math.max(idx, 0), TREND_DAYS - 1);
}

/** Count dates into per-day buckets across the trend window (oldest -> newest). */
export function bucketCounts(dates: Date[], windowStart: Date): number[] {
	const buckets = new Array<number>(TREND_DAYS).fill(0);
	for (const date of dates) {
		buckets[dayIndex(date, windowStart)] += 1;
	}
	return buckets;
}

/** Sum amounts into per-day buckets across the trend window (oldest -> newest). */
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

/** Project a Prisma `groupBy` result onto a fixed key set, defaulting to `base`. */
export function tallyGroups<G extends { _count: number }, K extends string>(
	base: Record<K, number>,
	groups: G[],
	keyOf: (group: G) => K,
): Record<K, number> {
	const result = { ...base };
	for (const group of groups) {
		result[keyOf(group)] = group._count;
	}
	return result;
}

/** "First Last" trimmed, or null when the person is absent / both name parts empty. */
export function formatPersonName(
	person: { firstName: string | null; lastName: string | null } | null,
): string | null {
	if (!person) return null;
	return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || null;
}

/** Completion percentage (0 when nothing assigned). */
export function completionRate(completed: number, total: number): number {
	return total > 0 ? (completed / total) * 100 : 0;
}

/** Sum paid-fee amounts, coercing Prisma Decimal values to number. */
export function sumFeeAmounts(fees: Array<{ amount: unknown }>): number {
	return fees.reduce<number>(
		(sum, fee) => sum + (fee.amount ? Number(fee.amount) : 0),
		0,
	);
}
