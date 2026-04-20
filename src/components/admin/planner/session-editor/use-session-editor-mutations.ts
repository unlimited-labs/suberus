import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import {
	deleteSlotFn,
	reorderSlotsFn,
	updateSlotDurationFn,
} from "@/utils/presentation-slots.functions";
import {
	allSessionsQueryOptions,
	assignChairFn,
	continueSeriesFn,
	deleteSessionFn,
	removeChairFn,
	splitSessionFn,
	unscheduledSubmissionsQueryOptions,
	updateSessionFn,
} from "@/utils/program-sessions.functions";
import { scheduleCapacityQueryOptions } from "@/utils/schedule.functions";
import {
	addMinutes,
	formatDurationMin,
	tzLocalInputToUtc,
} from "../tz-datetime";

type SessionTimes = { startAt: string | Date; endAt: string | Date };

export function useSessionEditorMutations(sessionId: string) {
	const queryClient = useQueryClient();

	const invalidate = useCallback(() => {
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

	const run = useCallback(
		async <T>(fn: () => Promise<T>, errorMsg: string): Promise<T | null> => {
			try {
				const result = await fn();
				invalidate();
				return result;
			} catch (e) {
				toast.error(e instanceof Error ? e.message : errorMsg);
				return null;
			}
		},
		[invalidate],
	);

	return {
		invalidate,
		updateTitle: (title: string) =>
			run(
				() => updateSessionFn({ data: { id: sessionId, title } }),
				"Failed to save",
			),
		updateTrack: (value: string) =>
			run(
				() =>
					updateSessionFn({
						data: { id: sessionId, trackId: value === "none" ? null : value },
					}),
				"Failed to update track",
			),
		updateRoom: (value: string) =>
			run(
				() =>
					updateSessionFn({
						data: { id: sessionId, roomId: value === "none" ? null : value },
					}),
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
