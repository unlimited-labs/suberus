import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { createSlotFn } from "@/utils/presentation-slots.functions";
import {
	allSessionsQueryOptions,
	moveSessionFn,
	unscheduledSubmissionsQueryOptions,
} from "@/utils/program-sessions.functions";
import { scheduleCapacityQueryOptions } from "@/utils/schedule.functions";
import {
	allBreaksQueryOptions,
	updateBreakFn,
} from "@/utils/schedule-breaks.functions";

interface CalendarMoveEvent {
	id: string | number;
	start: { toDate: () => Date };
	end: { toDate: () => Date };
	resourceId?: string | number;
	data?: { kind?: "session" | "break"; sessionId?: string; breakId?: string };
}

export function usePlannerMutations(defaultPresentationMin: number) {
	const queryClient = useQueryClient();

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: allSessionsQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: allBreaksQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: unscheduledSubmissionsQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: scheduleCapacityQueryOptions().queryKey,
		});
	}, [queryClient]);

	const handleSubmissionDrop = useCallback(
		async (sessionId: string, submissionId: string) => {
			try {
				await createSlotFn({
					data: {
						sessionId,
						submissionId,
						durationMin: defaultPresentationMin,
					},
				});
				invalidate();
			} catch (e) {
				toast.error(e instanceof Error ? e.message : "Failed to assign");
			}
		},
		[defaultPresentationMin, invalidate],
	);

	const handleEventUpdate = useCallback(
		async (event: CalendarMoveEvent) => {
			const kind = event.data?.kind;
			const roomId =
				typeof event.resourceId === "string" ? event.resourceId : null;
			const startAt = event.start.toDate().toISOString();
			const endAt = event.end.toDate().toISOString();

			try {
				if (kind === "session" && event.data?.sessionId) {
					await moveSessionFn({
						data: { id: event.data.sessionId, startAt, endAt, roomId },
					});
				} else if (kind === "break" && event.data?.breakId) {
					await updateBreakFn({
						data: { id: event.data.breakId, startAt, endAt, roomId },
					});
				}
				invalidate();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to update",
				);
			}
		},
		[invalidate],
	);

	return { invalidate, handleSubmissionDrop, handleEventUpdate };
}
