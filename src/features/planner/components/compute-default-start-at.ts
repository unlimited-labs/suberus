import { endOfDay, isAfter, isWithinInterval, set } from "date-fns";

export function computeDefaultStartAt(
	currentDate: Date | null,
	sessions: Array<{ startAt: string | Date; endAt: string | Date }>,
	confStart: Date | null,
	dayStartTime: string,
): Date {
	const day = currentDate ?? confStart ?? new Date();
	const [h, m] = (dayStartTime || "09:00").split(":").map(Number);
	const dayBegin = set(day, {
		hours: h,
		minutes: m,
		seconds: 0,
		milliseconds: 0,
	});
	const dayEnd = endOfDay(dayBegin);

	const daySessions = sessions.filter((s) =>
		isWithinInterval(new Date(s.startAt), { start: dayBegin, end: dayEnd }),
	);
	if (daySessions.length === 0) return dayBegin;
	return daySessions.reduce((acc: Date, s) => {
		const end = new Date(s.endAt);
		return isAfter(end, acc) ? end : acc;
	}, dayBegin);
}
