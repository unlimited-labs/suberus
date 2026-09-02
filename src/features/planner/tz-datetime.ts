import { TZDate, tz } from "@date-fns/tz";
import {
	addMinutes as dfAddMinutes,
	differenceInMinutes,
	eachDayOfInterval,
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

export function inTz(zone: string | undefined) {
	return { in: tz(resolveTz(zone)) };
}

export function utcToTzLocalInput(utc: Date, zone: string | undefined): string {
	return format(utc, "yyyy-MM-dd'T'HH:mm", inTz(zone));
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

export function tzDayStart(date: string, zone: string | undefined): Date {
	return tzLocalInputToUtc(`${date.slice(0, 10)}T00:00`, zone);
}

export function withWallTime(
	d: Date,
	hhmm: string,
	zone: string | undefined,
): Date {
	const [datePart] = utcToTzLocalInput(d, zone).split("T");
	return tzLocalInputToUtc(`${datePart}T${hhmm}`, zone);
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
	return isSameDay(a, b, inTz(zone));
}

export function formatDayLabel(d: Date, zone: string | undefined): string {
	return format(d, "EEE d MMM", inTz(zone));
}

export function formatClockTime(d: Date, zone: string | undefined): string {
	return format(d, "HH:mm", inTz(zone));
}

export function eachDayInTz(
	start: Date,
	end: Date,
	zone: string | undefined,
): Date[] {
	return eachDayOfInterval({ start, end }, inTz(zone));
}

export function formatZoneLabel(d: Date, zone: string | undefined): string {
	const resolved = resolveTz(zone);
	const abbr = new Intl.DateTimeFormat("en-US", {
		timeZone: resolved,
		timeZoneName: "short",
	})
		.formatToParts(d)
		.find((p) => p.type === "timeZoneName")?.value;
	return abbr ? `${resolved} (${abbr})` : resolved;
}
