import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
	allSessionsQueryOptions,
	unscheduledSubmissionsQueryOptions,
} from "@/utils/program-sessions.functions";
import {
	scheduleCapacityQueryOptions,
	scheduleIssuesQueryOptions,
	scheduleStateQueryOptions,
} from "@/utils/schedule.functions";
import { allBreaksQueryOptions } from "@/utils/schedule-breaks.functions";

export function useInvalidatePlannerQueries() {
	const queryClient = useQueryClient();

	return useCallback(() => {
		const keys = [
			allSessionsQueryOptions().queryKey,
			unscheduledSubmissionsQueryOptions().queryKey,
			scheduleCapacityQueryOptions().queryKey,
			allBreaksQueryOptions().queryKey,
			scheduleStateQueryOptions().queryKey,
			scheduleIssuesQueryOptions().queryKey,
		];
		for (const queryKey of keys) {
			queryClient.invalidateQueries({ queryKey });
		}
	}, [queryClient]);
}
