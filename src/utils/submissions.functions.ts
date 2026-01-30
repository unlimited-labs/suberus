import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSubmissionSchema } from "@/lib/validations/submission";
import { authMiddleware } from "./auth.middleware";
import { createNewSubmission } from "./submissions.server";

const inputSchema = z.object({
	type: z.enum(["ABSTRACT", "POSTER"]),
	title: z.string(),
	content: z.string(),
	authors: z.array(z.any()),
	keywords: z.array(z.string()),
});

export type SubmissionResult =
	| { success: true; id: string }
	| {
			success: false;
			error: string;
			issues?: Array<{ path: string[]; message: string }>;
	  };

export const createSubmission = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(inputSchema)
	.handler(async ({ data, context }): Promise<SubmissionResult> => {
		// Manual validation to return errors in expected format
		const result = createSubmissionSchema.safeParse(data);
		if (!result.success) {
			return {
				success: false,
				error: "Validation failed",
				issues: result.error.issues.map((issue) => ({
					path: issue.path.map(String),
					message: issue.message,
				})),
			};
		}

		const submission = await createNewSubmission(result.data, context.user.id);
		return { success: true, id: submission.id };
	});
