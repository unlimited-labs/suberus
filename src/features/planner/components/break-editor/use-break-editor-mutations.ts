import { deleteBreakFn, updateBreakFn } from "@/features/planner/api/breaks";
import { useInvalidatePlannerQueries } from "../hooks/use-invalidate-planner-queries";
import { useMutationRun } from "../hooks/use-mutation-run";

interface BreakHeaderFields {
	title: string;
	startAt: string;
	endAt: string;
	roomId: string | null;
}

export function useBreakEditorMutations(breakId: string) {
	const invalidate = useInvalidatePlannerQueries();
	const run = useMutationRun(invalidate);

	return {
		updateHeader: (fields: BreakHeaderFields) =>
			run(
				() => updateBreakFn({ data: { id: breakId, ...fields } }),
				"Failed to save",
			),
		deleteBreak: () =>
			run(
				() => deleteBreakFn({ data: { id: breakId } }),
				"Failed to delete break",
			),
	};
}
