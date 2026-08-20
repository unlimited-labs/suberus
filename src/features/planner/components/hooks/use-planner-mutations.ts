import type { CalendarEvent } from "@ilamy/calendar";
import { z } from "zod";
import { updateBreakFn } from "@/features/planner/api/breaks";
import { createPresentationFn } from "@/features/planner/api/presentations";
import { moveSessionFn } from "@/features/planner/api/sessions";
import { parseCalendarEventData } from "./parse-calendar-event-data";
import { useInvalidatePlannerQueries } from "./use-invalidate-planner-queries";
import { useMutationRun } from "./use-mutation-run";

export function usePlannerMutations(defaultPresentationMin: number) {
	const invalidate = useInvalidatePlannerQueries();
	const run = useMutationRun(invalidate);

	const handleSubmissionDrop = (sessionId: string, submissionId: string) =>
		run(
			() =>
				createPresentationFn({
					data: {
						sessionId,
						submissionId,
						durationMin: defaultPresentationMin,
					},
				}),
			"Failed to assign",
		);

	const handleEventUpdate = (event: CalendarEvent) => {
		const data = parseCalendarEventData(event);
		const roomId = z.string().safeParse(event.resourceId).data ?? null;
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
	};

	return { invalidate, handleSubmissionDrop, handleEventUpdate };
}
