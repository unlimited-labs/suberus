import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
	adminSubmissionsQueryOptions,
	editorSubmissionQueryOptions,
} from "@/features/submissions/api/admin-submissions";
import type { TransitionResult } from "@/lib/workflow/types";
import {
	confirmConditionsMetFn,
	editorOverrideFn,
	transitionToAwaitingDecisionFn,
} from "@/server-fns/workflow";

export function useSubmissionTransitions(submissionId: string) {
	const queryClient = useQueryClient();
	const [isTransitioning, setIsTransitioning] = useState(false);

	const invalidateSubmission = useCallback(
		() =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: editorSubmissionQueryOptions(submissionId).queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: adminSubmissionsQueryOptions().queryKey,
				}),
			]),
		[queryClient, submissionId],
	);

	async function runTransition(
		fn: () => Promise<TransitionResult>,
		successMsg: string,
		onSuccess?: () => void,
	) {
		setIsTransitioning(true);
		try {
			const result = await fn();
			if (result.success) {
				toast.success(successMsg);
				onSuccess?.();
				await invalidateSubmission();
			} else {
				toast.error(result.error || "Transition failed");
			}
		} catch {
			toast.error("Transition failed");
		} finally {
			setIsTransitioning(false);
		}
	}

	const handleTransitionToAwaitingDecision = () =>
		runTransition(
			() => transitionToAwaitingDecisionFn({ data: { submissionId } }),
			"Transitioned to Awaiting Decision",
		);

	const handleEditorOverride = (reasoning: string, onSuccess?: () => void) =>
		runTransition(
			() => editorOverrideFn({ data: { submissionId, reasoning } }),
			"Decision overridden — now in Awaiting Decision",
			onSuccess,
		);

	const handleConfirmConditionsMet = (
		reasoning: string,
		onSuccess?: () => void,
	) =>
		runTransition(
			() => confirmConditionsMetFn({ data: { submissionId, reasoning } }),
			"Conditions confirmed — submission accepted",
			onSuccess,
		);

	return {
		isTransitioning,
		invalidateSubmission,
		handleTransitionToAwaitingDecision,
		handleEditorOverride,
		handleConfirmConditionsMet,
	};
}
