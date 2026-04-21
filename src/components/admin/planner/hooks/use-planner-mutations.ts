import type { CalendarEvent } from "@ilamy/calendar";
import { useCallback } from "react";
import { createSlotFn } from "@/utils/presentation-slots.functions";
import { moveSessionFn } from "@/utils/program-sessions.functions";
import { updateBreakFn } from "@/utils/schedule-breaks.functions";
import type { BreakEventData } from "../break-event-card";
import type { SessionEventData } from "../session-event-card";
import { useInvalidatePlannerQueries } from "./use-invalidate-planner-queries";
import { useMutationRun } from "./use-mutation-run";

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
		(event: CalendarEvent) => {
			const data = event.data as SessionEventData | BreakEventData | undefined;
			const roomId =
				typeof event.resourceId === "string" ? event.resourceId : null;
			const startAt = event.start.toDate().toISOString();
			const endAt = event.end.toDate().toISOString();

			if (data?.kind === "session") {
				return run(
					() =>
						moveSessionFn({
							data: { id: data.sessionId, startAt, endAt, roomId },
						}),
					"Failed to update",
				);
			}
			if (data?.kind === "break") {
				return run(
					() =>
						updateBreakFn({
							data: { id: data.breakId, startAt, endAt, roomId },
						}),
					"Failed to update",
				);
			}
			return Promise.resolve(null);
		},
		[run],
	);

	return { invalidate, handleSubmissionDrop, handleEventUpdate };
}
