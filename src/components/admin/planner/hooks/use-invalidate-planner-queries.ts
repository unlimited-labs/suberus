import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { allBreaksQueryOptions } from "@/server-fns/planner/breaks";
import {
	scheduleCapacityQueryOptions,
	scheduleIssuesQueryOptions,
	scheduleStateQueryOptions,
} from "@/server-fns/planner/schedule";
import {
	allSessionsQueryOptions,
	unscheduledSubmissionsQueryOptions,
} from "@/server-fns/planner/sessions";

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
