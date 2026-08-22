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
