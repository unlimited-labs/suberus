import { addDays, isAfter } from "date-fns";
import { inTz, withWallTime } from "@/features/planner/tz-datetime";

export function computeDefaultStartAt(
	currentDate: Date | null,
	sessions: Array<{ startAt: string | Date; endAt: string | Date }>,
	confStart: Date | null,
	dayStartTime: string,
	zone: string | undefined,
): Date {
	const day = currentDate ?? confStart ?? new Date();
	const dayBegin = withWallTime(day, dayStartTime || "09:00", zone);
	const nextDayBegin = addDays(withWallTime(day, "00:00", zone), 1, inTz(zone));

	const daySessions = sessions.filter((s) => {
		const start = new Date(s.startAt);
		return start >= dayBegin && start < nextDayBegin;
	});
	if (daySessions.length === 0) return dayBegin;
	return daySessions.reduce((acc: Date, s) => {
		const end = new Date(s.endAt);
		return isAfter(end, acc) ? end : acc;
	}, dayBegin);
}
