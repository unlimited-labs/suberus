import { z } from "zod";

export const exhibitorAuthorSchema = z.object({
	firstName: z
		.string()
		.min(1, "First name is required")
		.max(100, "First name must be at most 100 characters"),
	lastName: z
		.string()
		.min(1, "Last name is required")
		.max(100, "Last name must be at most 100 characters"),
	email: z.email("Invalid email address"),
	affiliationId: z.uuid().nullable(),
	affiliationName: z.string().min(1, "Affiliation is required"),
	isPresenter: z.boolean(),
});

export const exhibitorPresentationSchema = z.object({
	title: z
		.string()
		.min(3, "Title must be at least 3 characters")
		.max(300, "Title must be at most 300 characters"),
	content: z.string().min(10, "Content must be at least 10 characters"),
	authors: z
		.array(exhibitorAuthorSchema)
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
	website: z.url("Invalid URL").optional().or(z.literal("")),
	presentation: exhibitorPresentationSchema.optional(),
});

export type ExhibitorPresentationInput = z.infer<
	typeof exhibitorPresentationSchema
>;
export type ExhibitorApplicationInput = z.infer<
	typeof exhibitorApplicationSchema
>;
