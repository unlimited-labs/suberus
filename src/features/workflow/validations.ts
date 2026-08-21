import { z } from "zod";

export const deskDecisionInput = z.object({
	submissionId: z.uuid(),
	reason: z.string().trim().min(1, "Reason is required"),
});
