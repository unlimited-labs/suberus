import {
	addMinutes as dfAddMinutes,
	differenceInMinutes,
	format,
} from "date-fns";
import { dateForPattern } from "@/shared/lib/format-date";
import { resolveZone, zonedDateString } from "@/shared/lib/zoned";

export {
	eachDayInZone as eachDayInTz,
	formatClockTime,
	sameDayInZone as sameDayInTz,
	startOfDayInZone as tzDayStart,
	utcToWallClock as utcToTzLocalInput,
	wallClockToUtc as tzLocalInputToUtc,
	withWallTime,
} from "@/shared/lib/zoned";

export function formatDurationMin(start: Date, end: Date): number {
	return differenceInMinutes(end, start);
}

export const addMinutes = dfAddMinutes;

export function formatDayLabel(d: Date, zone: string | undefined): string {
	return format(dateForPattern(zonedDateString(d, zone)), "EEE d MMM");
}

export function formatZoneLabel(d: Date, zone: string | undefined): string {
	const resolved = resolveZone(zone);
	const abbr = new Intl.DateTimeFormat("en-US", {
		timeZone: resolved,
		timeZoneName: "short",
	})
		.formatToParts(d)
		.find((p) => p.type === "timeZoneName")?.value;
	return abbr ? `${resolved} (${abbr})` : resolved;
}
