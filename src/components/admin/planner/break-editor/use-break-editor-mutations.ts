import {
	deleteBreakFn,
	updateBreakFn,
} from "@/utils/schedule-breaks.functions";
import { useInvalidatePlannerQueries } from "../hooks/use-invalidate-planner-queries";
import { useMutationRun } from "../hooks/use-mutation-run";

export function useBreakEditorMutations(breakId: string) {
	const invalidate = useInvalidatePlannerQueries();
	const run = useMutationRun(invalidate);

	return {
		updateTitle: (title: string) =>
			run(
				() => updateBreakFn({ data: { id: breakId, title } }),
				"Failed to save",
			),
		updateRoom: (roomId: string | null) =>
			run(
				() => updateBreakFn({ data: { id: breakId, roomId } }),
				"Failed to update room",
			),
		deleteBreak: () =>
			run(
				() => deleteBreakFn({ data: { id: breakId } }),
				"Failed to delete break",
			),
	};
}
