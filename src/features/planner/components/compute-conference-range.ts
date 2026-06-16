import type { ConferenceSettings } from "@/features/settings/api/settings";

export interface ConferenceRange {
	confStart: Date | null;
	confEnd: Date | null;
	tz: string | undefined;
}

/**
 * Derives the planner's conference bounds and timezone from settings. Empty
 * date strings become null; a blank timezone becomes undefined (so the calendar
 * falls back to its own default).
 */
export function computeConferenceRange(
	settings: Pick<
		ConferenceSettings,
		"conferenceStartDate" | "conferenceEndDate" | "timezone"
	>,
): ConferenceRange {
	return {
		confStart: settings.conferenceStartDate
			? new Date(settings.conferenceStartDate)
			: null,
		confEnd: settings.conferenceEndDate
			? new Date(settings.conferenceEndDate)
			: null,
		tz: settings.timezone || undefined,
	};
}

/** True when the viewed date sits outside the conference bounds. */
export function isOutsideConferenceRange(
	currentDate: Date | null,
	confStart: Date | null,
	confEnd: Date | null,
): boolean {
	return (
		currentDate !== null &&
		confStart !== null &&
		confEnd !== null &&
		(currentDate < confStart || currentDate > confEnd)
	);
}
