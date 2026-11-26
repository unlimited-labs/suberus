import { z } from "zod";

export const deskDecisionInput = z.object({
	submissionId: z.uuid(),
	reason: z.string().trim().min(1, "Reason is required"),
});

export const editorDecisionInput = z.object({
	decision: z
		.enum(["ACCEPT", "CONDITIONALLY_ACCEPT", "REVISE_AND_RESUBMIT", "REJECT"])
		.describe("The editor's decision on the submission."),
	reasoning: z
		.string()
		.optional()
		.describe("Internal rationale for other editors; authors never see it."),
	letterToAuthor: z
		.string()
		.optional()
		.describe("Message sent to the authors together with the decision."),
});
