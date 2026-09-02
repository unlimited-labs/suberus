import type { WeekDays } from "@ilamy/calendar";
import { differenceInCalendarDays, getDay } from "date-fns";
import { eachDayInTz, inTz } from "@/features/planner/tz-datetime";

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
	const opts = inTz(zone);
	const diffDays = differenceInCalendarDays(end, start, opts) + 1;
	if (diffDays <= 0 || diffDays >= 7) return [];

	const present = new Set(
		eachDayInTz(start, end, zone).map((d) => getDay(d, opts)),
	);
	return WEEKDAYS.filter((_, idx) => !present.has(idx));
}
