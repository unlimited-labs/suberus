import type { WeekDays } from "@ilamy/calendar";
import { eachDayInTz } from "@/features/planner/tz-datetime";
import { calendarDaysBetween, isoWeekday } from "@/shared/lib/zoned";

const WEEKDAYS: readonly WeekDays[] = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
] as const;

export function computeHiddenWeekdays(
	start: Date | null,
	end: Date | null,
	zone: string | undefined,
): WeekDays[] {
	if (!start || !end) return [];
	const diffDays = calendarDaysBetween(start, end, zone) + 1;
	if (diffDays <= 0 || diffDays >= 7) return [];

	const present = new Set(
		eachDayInTz(start, end, zone).map((d) => isoWeekday(d, zone) % 7),
	);
	return WEEKDAYS.filter((_, idx) => !present.has(idx));
}
