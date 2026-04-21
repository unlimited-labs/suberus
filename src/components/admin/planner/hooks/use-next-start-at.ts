import { useSuspenseQuery } from "@tanstack/react-query";
import { allSessionsQueryOptions } from "@/utils/program-sessions.functions";
import { conferenceSettingsQueryOptions } from "@/utils/settings.functions";
import { computeDefaultStartAt } from "../compute-default-start-at";

export function useNextStartAt(currentDate: Date | null): Date {
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const confStart = settings.conferenceStartDate
		? new Date(settings.conferenceStartDate)
		: null;
	return computeDefaultStartAt(
		currentDate,
		sessions,
		confStart,
		settings.dayStart,
	);
}
