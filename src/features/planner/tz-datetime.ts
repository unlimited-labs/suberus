import {
	addMinutes as dfAddMinutes,
	differenceInMinutes,
	format,
} from "date-fns";
import { resolveZone, zonedDayForPattern } from "@/shared/lib/zoned";

export function formatDurationMin(start: Date, end: Date): number {
	return differenceInMinutes(end, start);
}

export const addMinutes = dfAddMinutes;

export function formatDayLabel(d: Date, zone: string | undefined): string {
	return format(zonedDayForPattern(d, zone), "EEE d MMM");
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
