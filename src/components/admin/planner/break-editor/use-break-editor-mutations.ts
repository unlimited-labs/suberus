import {
	deleteBreakFn,
	updateBreakFn,
} from "@/utils/schedule-breaks.functions";
import { useInvalidatePlannerQueries } from "../hooks/use-invalidate-planner-queries";
import { useMutationRun } from "../hooks/use-mutation-run";

export function useBreakEditorMutations(breakId: string) {
	const { invalidateBreaks: invalidate } = useInvalidatePlannerQueries();
	const run = useMutationRun(invalidate);

	return {
		updateTitle: (title: string) =>
			run(
				() => updateBreakFn({ data: { id: breakId, title } }),
				"Failed to save",
			),
		updateRoom: (value: string) =>
			run(
				() =>
					updateBreakFn({
						data: { id: breakId, roomId: value === "none" ? null : value },
					}),
				"Failed to update room",
			),
		deleteBreak: () =>
			run(
				() => deleteBreakFn({ data: { id: breakId } }),
				"Failed to delete break",
			),
	};
}
