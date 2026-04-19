export function utcToTzLocalInput(utc: Date, tz: string | undefined): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz || undefined,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(utc);
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
	return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function tzLocalInputToUtc(local: string, tz: string | undefined): Date {
	const [datePart, timePart] = local.split("T");
	const [y, m, d] = datePart.split("-").map(Number);
	const [hh, mm] = timePart.split(":").map(Number);
	const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
	if (!tz) return guess;
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(guess);
	const g = (t: string) =>
		Number(parts.find((p) => p.type === t)?.value ?? "0");
	const asTz = Date.UTC(
		g("year"),
		g("month") - 1,
		g("day"),
		g("hour"),
		g("minute"),
		g("second"),
	);
	const offsetMs = asTz - guess.getTime();
	return new Date(guess.getTime() - offsetMs);
}

export function formatDurationMin(start: Date, end: Date): number {
	return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function addMinutes(d: Date, min: number): Date {
	return new Date(d.getTime() + min * 60_000);
}
