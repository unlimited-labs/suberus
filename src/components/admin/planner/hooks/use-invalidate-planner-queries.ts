import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
	allSessionsQueryOptions,
	unscheduledSubmissionsQueryOptions,
} from "@/utils/program-sessions.functions";
import { scheduleCapacityQueryOptions } from "@/utils/schedule.functions";
import { allBreaksQueryOptions } from "@/utils/schedule-breaks.functions";

export function useInvalidatePlannerQueries() {
	const queryClient = useQueryClient();

	const invalidateSessions = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: allSessionsQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: unscheduledSubmissionsQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: scheduleCapacityQueryOptions().queryKey,
		});
	}, [queryClient]);

	const invalidateBreaks = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: allBreaksQueryOptions().queryKey,
		});
	}, [queryClient]);

	const invalidateAll = useCallback(() => {
		invalidateSessions();
		invalidateBreaks();
	}, [invalidateSessions, invalidateBreaks]);

	return useMemo(
		() => ({ invalidateSessions, invalidateBreaks, invalidateAll }),
		[invalidateSessions, invalidateBreaks, invalidateAll],
	);
}
