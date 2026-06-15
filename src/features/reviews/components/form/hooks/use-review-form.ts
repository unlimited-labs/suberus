import { useStore } from "@tanstack/react-form";
import { useMemo } from "react";
import {
	createReviewSchema,
	type ReviewFormData,
} from "@/features/reviews/validations";
import type { ReviewDecision } from "@/generated/prisma/enums";
import { useAppForm } from "@/shared/hooks/use-app-form";

interface UseReviewFormArgs {
	onSubmit: (data: ReviewFormData) => Promise<void>;
	initialData?: Partial<ReviewFormData>;
	scoringCriteria: { name: string; description: string }[];
	enableConfidenceLevel: boolean;
}

/**
 * Owns ReviewForm behaviour: form instance, dynamic validation schema, initial
 * per-criterion scores and section-completion flags. Leaves the component as
 * pure presentation.
 */
export function useReviewForm({
	onSubmit,
	initialData,
	scoringCriteria,
	enableConfidenceLevel,
}: UseReviewFormArgs) {
	const reviewSchema = useMemo(
		() => createReviewSchema({ enableConfidenceLevel, scoringCriteria }),
		[enableConfidenceLevel, scoringCriteria],
	);

	// Build initial scores from criteria
	const initialScores: Record<string, number> = {};
	for (const c of scoringCriteria) {
		initialScores[c.name] = initialData?.scores?.[c.name] ?? 3;
	}

	const form = useAppForm({
		defaultValues: {
			decision: initialData?.decision || ("ACCEPT" as ReviewDecision),
			scores: initialScores,
			confidenceLevel: initialData?.confidenceLevel || 3,
			comments: initialData?.comments || "",
			privateNotes: initialData?.privateNotes || "",
		},
		validators: {
			onChange: reviewSchema,
			onSubmit: reviewSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const values = useStore(form.store, (state) => state.values);

	// Progress indicators
	const hasDecision = !!values.decision;
	const hasScores =
		scoringCriteria.length === 0 ||
		scoringCriteria.every((c) => (values.scores[c.name] ?? 0) > 0);
	const hasConfidence = !enableConfidenceLevel || values.confidenceLevel > 0;
	const hasComments = true;
	const allComplete = hasDecision && hasScores && hasConfidence && hasComments;

	return {
		form,
		progress: { hasDecision, hasScores, hasConfidence, hasComments },
		allComplete,
	};
}

export type ReviewFormApi = ReturnType<typeof useReviewForm>["form"];
