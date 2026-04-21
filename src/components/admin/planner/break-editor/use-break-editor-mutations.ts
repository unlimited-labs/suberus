import { useCallback } from "react";
import { toast } from "sonner";
import {
	deleteBreakFn,
	updateBreakFn,
} from "@/utils/schedule-breaks.functions";
import { useInvalidatePlannerQueries } from "../hooks/use-invalidate-planner-queries";

export function useBreakEditorMutations(breakId: string) {
	const { invalidateBreaks: invalidate } = useInvalidatePlannerQueries();

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
