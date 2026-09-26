import { z } from "zod";
import { authorSchema } from "@/shared/lib/author-schema";

export const exhibitorPresentationSchema = z.object({
	title: z
		.string()
		.min(3, "Title must be at least 3 characters")
		.max(300, "Title must be at most 300 characters"),
	content: z.string().min(10, "Content must be at least 10 characters"),
	authors: z
		.array(authorSchema)
		.min(1, "At least one author is required")
		.refine(
			(authors) => authors.filter((a) => a.isPresenter).length === 1,
			"Exactly one author must be marked as presenter",
		),
});

export const exhibitorApplicationSchema = z.object({
	companyName: z
		.string()
		.min(1, "Company name is required")
		.max(200, "Company name must be at most 200 characters"),
	description: z
		.string()
		.max(5000, "Description must be at most 5000 characters")
		.optional(),
	website: z.httpUrl("Invalid URL").optional().or(z.literal("")),
	presentation: exhibitorPresentationSchema.optional(),
});

export type ExhibitorPresentationInput = z.infer<
	typeof exhibitorPresentationSchema
>;
export type ExhibitorApplicationInput = z.infer<
	typeof exhibitorApplicationSchema
>;
