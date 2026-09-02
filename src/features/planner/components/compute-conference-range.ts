import { differenceInCalendarDays } from "date-fns";
import { inTz, tzDayStart } from "@/features/planner/tz-datetime";
import type { ConferenceSettings } from "@/features/settings/api/settings";

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
	const tz = settings.timezone || undefined;
	return {
		confStart: settings.conferenceStartDate
			? tzDayStart(settings.conferenceStartDate, tz)
			: null,
		confEnd: settings.conferenceEndDate
			? tzDayStart(settings.conferenceEndDate, tz)
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
	const opts = inTz(zone);
	return (
		differenceInCalendarDays(currentDate, confStart, opts) < 0 ||
		differenceInCalendarDays(currentDate, confEnd, opts) > 0
	);
}
