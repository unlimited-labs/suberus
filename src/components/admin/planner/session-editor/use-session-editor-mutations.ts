import { toast } from "sonner";
import {
	deleteSlotFn,
	reorderSlotsFn,
	updateSlotDurationFn,
} from "@/utils/presentation-slots.functions";
import {
	assignChairFn,
	continueSeriesFn,
	deleteSessionFn,
	removeChairFn,
	splitSessionFn,
	updateSessionFn,
} from "@/utils/program-sessions.functions";
import {
	addMinutes,
	formatDurationMin,
	tzLocalInputToUtc,
} from "@/utils/tz-datetime";
import { useInvalidatePlannerQueries } from "../hooks/use-invalidate-planner-queries";
import { useMutationRun } from "../hooks/use-mutation-run";

type SessionTimes = { startAt: string | Date; endAt: string | Date };

export function useSessionEditorMutations(sessionId: string) {
	const { invalidateSessions: invalidate } = useInvalidatePlannerQueries();
	const run = useMutationRun(invalidate);

	return {
		invalidate,
		updateTitle: (title: string) =>
			run(
				() => updateSessionFn({ data: { id: sessionId, title } }),
				"Failed to save",
			),
		updateTrack: (trackId: string | null) =>
			run(
				() => updateSessionFn({ data: { id: sessionId, trackId } }),
				"Failed to update track",
			),
		updateRoom: (roomId: string | null) =>
			run(
				() => updateSessionFn({ data: { id: sessionId, roomId } }),
				"Failed to update room",
			),
		updateStart: (
			local: string,
			tz: string | undefined,
			session: SessionTimes,
		) => {
			if (!local) return Promise.resolve(null);
			const newStart = tzLocalInputToUtc(local, tz);
			const duration = formatDurationMin(
				new Date(session.startAt),
				new Date(session.endAt),
			);
			const newEnd = addMinutes(newStart, duration);
			return run(
				() =>
					updateSessionFn({
						data: {
							id: sessionId,
							startAt: newStart.toISOString(),
							endAt: newEnd.toISOString(),
						},
					}),
				"Failed to update time",
			);
		},
		updateDuration: (minutes: number, session: SessionTimes) => {
			const newEnd = addMinutes(new Date(session.startAt), minutes);
			return run(
				() =>
					updateSessionFn({
						data: { id: sessionId, endAt: newEnd.toISOString() },
					}),
				"Failed to update duration",
			);
		},
		addChair: (userId: string) =>
			run(
				() => assignChairFn({ data: { sessionId, userId } }),
				"Failed to add chair",
			),
		removeChair: (userId: string) =>
			run(
				() => removeChairFn({ data: { sessionId, userId } }),
				"Failed to remove chair",
			),
		removePresentation: (id: string) =>
			run(() => deleteSlotFn({ data: { id } }), "Failed to remove"),
		updateSlotDuration: (id: string, durationMin: number) =>
			run(
				() => updateSlotDurationFn({ data: { id, durationMin } }),
				"Failed to update duration",
			),
		reorderPresentations: (orderedIds: string[]) =>
			run(
				() => reorderSlotsFn({ data: { sessionId, orderedIds } }),
				"Failed to reorder",
			),
		continueSeries: async () => {
			const r = await run(
				() => continueSeriesFn({ data: { sessionId } }),
				"Failed to continue series",
			);
			if (r !== null) toast.success("Created next session in series");
		},
		split: async (afterSlotOrder: number) => {
			const r = await run(
				() => splitSessionFn({ data: { sessionId, afterSlotOrder } }),
				"Failed to split",
			);
			if (r !== null) toast.success("Session split");
			return r;
		},
		deleteSession: () =>
			run(
				() => deleteSessionFn({ data: { id: sessionId } }),
				"Failed to delete session",
			),
	};
}
