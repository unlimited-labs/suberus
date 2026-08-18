import { toast } from "sonner";
import {
	deletePresentationFn,
	reorderPresentationsFn,
	setPresentationCancelledFn,
	updatePresentationDurationFn,
} from "@/features/planner/api/presentations";
import {
	assignChairFn,
	continueSeriesFn,
	deleteSessionFn,
	removeChairFn,
	splitSessionFn,
	updateSessionFn,
} from "@/features/planner/api/sessions";
import { useInvalidatePlannerQueries } from "../hooks/use-invalidate-planner-queries";
import { useMutationRun } from "../hooks/use-mutation-run";

interface SessionHeaderFields {
	title: string;
	startAt: string;
	endAt: string;
	roomId: string | null;
	trackId: string | null;
	untimedSlots: boolean;
}

export function useSessionEditorMutations(sessionId: string) {
	const invalidate = useInvalidatePlannerQueries();
	const run = useMutationRun(invalidate);

	return {
		invalidate,
		updateHeader: (fields: SessionHeaderFields) =>
			run(
				() => updateSessionFn({ data: { id: sessionId, ...fields } }),
				"Failed to save",
			),
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
			run(() => deletePresentationFn({ data: { id } }), "Failed to remove"),
		updatePresentationDuration: (id: string, durationMin: number) =>
			run(
				() => updatePresentationDurationFn({ data: { id, durationMin } }),
				"Failed to update duration",
			),
		setCancelled: (id: string, cancelled: boolean) =>
			run(
				() => setPresentationCancelledFn({ data: { id, cancelled } }),
				"Failed to update",
			),
		reorderPresentations: (orderedIds: string[]) =>
			run(
				() => reorderPresentationsFn({ data: { sessionId, orderedIds } }),
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
