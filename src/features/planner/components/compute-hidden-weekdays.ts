import { tz } from "@date-fns/tz";
import type { WeekDays } from "@ilamy/calendar";
import { differenceInCalendarDays, eachDayOfInterval, getDay } from "date-fns";

const WEEKDAYS: readonly WeekDays[] = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
] as const;

// Conference start/end are UTC-midnight dates; evaluate weekdays in UTC so the
// runtime timezone can't shift them by a day.
const inUtc = { in: tz("UTC") };

export function computeHiddenWeekdays(
	start: Date | null,
	end: Date | null,
): WeekDays[] {
	if (!start || !end) return [];
	const diffDays = differenceInCalendarDays(end, start, inUtc) + 1;
	if (diffDays <= 0 || diffDays >= 7) return [];

	const present = new Set(
		eachDayOfInterval({ start, end }, inUtc).map((d) => getDay(d, inUtc)),
	);
	return WEEKDAYS.filter((_, idx) => !present.has(idx));
}
