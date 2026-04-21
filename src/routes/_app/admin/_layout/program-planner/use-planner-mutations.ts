import { useCallback } from "react";
import { useInvalidatePlannerQueries } from "@/components/admin/planner/hooks/use-invalidate-planner-queries";
import { useMutationRun } from "@/components/admin/planner/hooks/use-mutation-run";
import { createSlotFn } from "@/utils/presentation-slots.functions";
import { moveSessionFn } from "@/utils/program-sessions.functions";
import { updateBreakFn } from "@/utils/schedule-breaks.functions";

interface CalendarMoveEvent {
	id: string | number;
	start: { toDate: () => Date };
	end: { toDate: () => Date };
	resourceId?: string | number;
	data?: { kind?: "session" | "break"; sessionId?: string; breakId?: string };
}

export function usePlannerMutations(defaultPresentationMin: number) {
	const { invalidateAll: invalidate } = useInvalidatePlannerQueries();
	const run = useMutationRun(invalidate);

	const handleSubmissionDrop = useCallback(
		(sessionId: string, submissionId: string) =>
			run(
				() =>
					createSlotFn({
						data: {
							sessionId,
							submissionId,
							durationMin: defaultPresentationMin,
						},
					}),
				"Failed to assign",
			),
		[defaultPresentationMin, run],
	);

	const handleEventUpdate = useCallback(
		(event: CalendarMoveEvent) => {
			const kind = event.data?.kind;
			const roomId =
				typeof event.resourceId === "string" ? event.resourceId : null;
			const startAt = event.start.toDate().toISOString();
			const endAt = event.end.toDate().toISOString();

			const sessionId = event.data?.sessionId;
			const breakId = event.data?.breakId;
			if (kind === "session" && sessionId) {
				return run(
					() =>
						moveSessionFn({ data: { id: sessionId, startAt, endAt, roomId } }),
					"Failed to update",
				);
			}
			if (kind === "break" && breakId) {
				return run(
					() =>
						updateBreakFn({ data: { id: breakId, startAt, endAt, roomId } }),
					"Failed to update",
				);
			}
			return Promise.resolve(null);
		},
		[run],
	);

	return { invalidate, handleSubmissionDrop, handleEventUpdate };
}
