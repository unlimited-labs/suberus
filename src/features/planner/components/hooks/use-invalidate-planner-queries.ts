import { useQueryClient } from "@tanstack/react-query";
import { allBreaksQueryOptions } from "@/features/planner/api/breaks";
import {
	scheduleCapacityQueryOptions,
	scheduleIssuesQueryOptions,
	scheduleStateQueryOptions,
} from "@/features/planner/api/schedule";
import {
	allSessionsQueryOptions,
	unscheduledSubmissionsQueryOptions,
} from "@/features/planner/api/sessions";

export function useInvalidatePlannerQueries() {
	const queryClient = useQueryClient();

	return () => {
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
	};
}
