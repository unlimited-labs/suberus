import type { WeekDays } from "@ilamy/calendar";

const WEEKDAYS: readonly WeekDays[] = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
] as const;

const MS_PER_DAY = 86_400_000;

export function computeHiddenWeekdays(
	start: Date | null,
	end: Date | null,
): WeekDays[] {
	if (!start || !end) return [];
	const startMs = Date.UTC(
		start.getUTCFullYear(),
		start.getUTCMonth(),
		start.getUTCDate(),
	);
	const endMs = Date.UTC(
		end.getUTCFullYear(),
		end.getUTCMonth(),
		end.getUTCDate(),
	);
	const diffDays = Math.round((endMs - startMs) / MS_PER_DAY) + 1;
	if (diffDays <= 0 || diffDays >= 7) return [];

	const present = new Set<number>();
	for (let d = 0; d < diffDays; d++) {
		const date = new Date(startMs + d * MS_PER_DAY);
		present.add(date.getUTCDay());
	}
	return WEEKDAYS.filter((_, idx) => !present.has(idx));
}
