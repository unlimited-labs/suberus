export function computeDefaultStartAt(
	currentDate: Date | null,
	sessions: Array<{ startAt: string | Date; endAt: string | Date }>,
	confStart: Date | null,
	dayStartTime: string,
): Date {
	const day = currentDate ?? confStart ?? new Date();
	const dayBegin = new Date(day);
	const [h, m] = (dayStartTime || "09:00").split(":").map(Number);
	dayBegin.setHours(h, m, 0, 0);

	const dayEnd = new Date(dayBegin);
	dayEnd.setHours(23, 59, 59, 999);

	const daySessions = sessions.filter((s) => {
		const start = new Date(s.startAt);
		return start >= dayBegin && start <= dayEnd;
	});
	if (daySessions.length === 0) return dayBegin;
	return daySessions.reduce((acc: Date, s) => {
		const end = new Date(s.endAt);
		return end > acc ? end : acc;
	}, dayBegin);
}
