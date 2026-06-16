import type { ReviewFormData } from "@/features/reviews/validations";

/**
 * Builds the ReviewForm default values: per-criterion scores (default 3) plus
 * the scalar field fallbacks. Mirrors the prior inline defaults exactly.
 */
export function buildReviewDefaults(
	initialData: Partial<ReviewFormData> | undefined,
	scoringCriteria: { name: string }[],
): ReviewFormData {
	const scores: Record<string, number> = {};
	for (const c of scoringCriteria) {
		scores[c.name] = initialData?.scores?.[c.name] ?? 3;
	}

	return {
		decision: initialData?.decision || "ACCEPT",
		scores,
		confidenceLevel: initialData?.confidenceLevel || 3,
		comments: initialData?.comments || "",
		privateNotes: initialData?.privateNotes || "",
	};
}

export interface ReviewProgress {
	hasDecision: boolean;
	hasScores: boolean;
	hasConfidence: boolean;
	hasComments: boolean;
	allComplete: boolean;
}

/** Derives the section-completion flags shown by the form progress indicator. */
export function computeReviewProgress(
	values: ReviewFormData,
	scoringCriteria: { name: string }[],
	enableConfidenceLevel: boolean,
): ReviewProgress {
	const hasDecision = !!values.decision;
	const hasScores =
		scoringCriteria.length === 0 ||
		scoringCriteria.every((c) => (values.scores[c.name] ?? 0) > 0);
	const hasConfidence = !enableConfidenceLevel || values.confidenceLevel > 0;
	const hasComments = true;
	const allComplete = hasDecision && hasScores && hasConfidence && hasComments;

	return { hasDecision, hasScores, hasConfidence, hasComments, allComplete };
}
