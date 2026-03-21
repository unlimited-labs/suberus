import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { TransitionResult } from "@/lib/workflow/types";
import { editorSubmissionQueryOptions } from "@/utils/admin-submissions.functions";
import {
	confirmConditionsMetFn,
	editorOverrideFn,
	transitionToAwaitingDecisionFn,
	transitionToReviewsCompleteFn,
} from "@/utils/workflow.functions";

export function useSubmissionTransitions(submissionId: string) {
	const queryClient = useQueryClient();
	const [isTransitioning, setIsTransitioning] = useState(false);

	const invalidateSubmission = useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: editorSubmissionQueryOptions(submissionId).queryKey,
			}),
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

	const handleTransitionToReviewsComplete = () =>
		runTransition(
			() => transitionToReviewsCompleteFn({ data: { submissionId } }),
			"Transitioned to Reviews Complete",
		);

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
		handleTransitionToReviewsComplete,
		handleTransitionToAwaitingDecision,
		handleEditorOverride,
		handleConfirmConditionsMet,
	};
}
