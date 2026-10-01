import type { ConferenceSettings } from "@/features/settings/api/settings";
import { calendarDaysBetween, startOfDayInZone } from "@/shared/lib/zoned";

export interface ConferenceRange {
	confStart: Date | null;
	confEnd: Date | null;
	tz: string | undefined;
}

export function computeConferenceRange(
	settings: Pick<
		ConferenceSettings,
		"conferenceStartDate" | "conferenceEndDate" | "timezone"
	>,
): ConferenceRange {
	const tz = settings.timezone || "UTC";
	return {
		confStart: settings.conferenceStartDate
			? startOfDayInZone(settings.conferenceStartDate, tz)
			: null,
		confEnd: settings.conferenceEndDate
			? startOfDayInZone(settings.conferenceEndDate, tz)
			: null,
		tz,
	};
}

export function isOutsideConferenceRange(
	currentDate: Date | null,
	confStart: Date | null,
	confEnd: Date | null,
	zone: string | undefined,
): boolean {
	if (!currentDate || !confStart || !confEnd) return false;
	return (
		calendarDaysBetween(confStart, currentDate, zone) < 0 ||
		calendarDaysBetween(confEnd, currentDate, zone) > 0
	);
}
