import { TZDate, tz } from "@date-fns/tz";
import {
	addMinutes as dfAddMinutes,
	differenceInMinutes,
	format,
	isSameDay,
} from "date-fns";

function resolveTz(zone: string | undefined): string {
	if (zone) return zone;
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
}

export function utcToTzLocalInput(utc: Date, zone: string | undefined): string {
	return format(utc, "yyyy-MM-dd'T'HH:mm", { in: tz(resolveTz(zone)) });
}

export function tzLocalInputToUtc(
	local: string,
	zone: string | undefined,
): Date {
	const [datePart, timePart] = local.split("T");
	const [y, m, d] = datePart.split("-").map(Number);
	const [hh, mm] = timePart.split(":").map(Number);
	const wall = new TZDate(y, m - 1, d, hh, mm, resolveTz(zone));
	return new Date(wall.getTime());
}

export function formatDurationMin(start: Date, end: Date): number {
	return differenceInMinutes(end, start);
}

export const addMinutes = dfAddMinutes;

export function sameDayInTz(
	a: Date,
	b: Date,
	zone: string | undefined,
): boolean {
	return isSameDay(a, b, { in: tz(resolveTz(zone)) });
}

export function formatDayLabel(d: Date, zone: string | undefined): string {
	return format(d, "EEE d MMM", { in: tz(resolveTz(zone)) });
}

export function formatClockTime(d: Date, zone: string | undefined): string {
	return format(d, "HH:mm", { in: tz(resolveTz(zone)) });
}
