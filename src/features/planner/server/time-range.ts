export interface TimeRange {
	from?: Date;
	to?: Date;
}

export function assertOrderedTimes(startAt?: Date, endAt?: Date): void {
	if (startAt && endAt && endAt <= startAt) {
		throw new Error("End time must be after the start time");
	}
}

export function nextDay(day: string): string {
	const d = new Date(`${day}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + 1);
	return d.toISOString().slice(0, 10);
}

/** Matches anything overlapping the range, so items straddling a day boundary stay in. */
export function overlapWhere(range: TimeRange) {
	return {
		startAt: range.to ? { lt: range.to } : undefined,
		endAt: range.from ? { gt: range.from } : undefined,
	};
}
