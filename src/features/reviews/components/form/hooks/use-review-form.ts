import { useSelector } from "@tanstack/react-store";
import {
	buildReviewDefaults,
	computeReviewProgress,
} from "@/features/reviews/components/form/review-form-helpers";
import {
	createReviewSchema,
	type ReviewFormData,
} from "@/features/reviews/validations";
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
	const reviewSchema = createReviewSchema({
		enableConfidenceLevel,
		scoringCriteria,
	});

	const form = useAppForm({
		defaultValues: buildReviewDefaults(initialData, scoringCriteria),
		validators: {
			onChange: reviewSchema,
			onSubmit: reviewSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const values = useSelector(form.store, (state) => state.values);

	const { allComplete, ...progress } = computeReviewProgress(
		values,
		scoringCriteria,
		enableConfidenceLevel,
	);

	return { form, progress, allComplete };
}

export type ReviewFormApi = ReturnType<typeof useReviewForm>["form"];
