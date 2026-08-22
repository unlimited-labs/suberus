import { z } from "zod";

export interface ReviewSchemaOptions {
	enableConfidenceLevel: boolean;
	scoringCriteria: { name: string }[];
}

export function createReviewSchema(options: ReviewSchemaOptions) {
	const scoresShape: Record<string, z.ZodNumber> = {};
	for (const c of options.scoringCriteria) {
		scoresShape[c.name] = z.number().min(1, "Score required").max(5);
	}

	return z.object({
		decision: z.enum([
			"ACCEPT",
			"ACCEPT_WITH_MINOR_REVISIONS",
			"REVISE_AND_RESUBMIT",
			"REJECT",
		]),
		scores: z.object(scoresShape),
		confidenceLevel: options.enableConfidenceLevel
			? z.number().min(1, "Confidence level is required").max(5)
			: z.number(),
		comments: z.string(),
		privateNotes: z.string(),
	});
}

export type ReviewFormData = z.infer<ReturnType<typeof createReviewSchema>>;
