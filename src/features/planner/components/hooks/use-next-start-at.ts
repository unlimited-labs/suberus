import { useSuspenseQuery } from "@tanstack/react-query";
import { allSessionsQueryOptions } from "@/features/planner/api/sessions";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { computeConferenceRange } from "../compute-conference-range";
import { computeDefaultStartAt } from "../compute-default-start-at";

export function useNextStartAt(currentDate: Date | null): Date {
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const { confStart, tz } = computeConferenceRange(settings);
	return computeDefaultStartAt(
		currentDate,
		sessions,
		confStart,
		settings.dayStart,
		tz,
	);
}
