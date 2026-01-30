import { z } from "zod";

export const authorSchema = z.object({
	firstName: z
		.string()
		.min(1, "First name is required")
		.max(100, "First name must be at most 100 characters"),
	lastName: z
		.string()
		.min(1, "Last name is required")
		.max(100, "Last name must be at most 100 characters"),
	email: z.string().email("Invalid email address"),
	affiliationId: z.string().uuid().nullable(),
	affiliationName: z
		.string()
		.min(1, "Affiliation is required")
		.max(200, "Affiliation must be at most 200 characters"),
	isPresenter: z.boolean(),
});

export const createSubmissionSchema = z.object({
	type: z.enum(["ABSTRACT", "POSTER"]),
	title: z
		.string()
		.min(5, "Title must be at least 5 characters")
		.max(300, "Title must be at most 300 characters"),
	content: z
		.string()
		.min(100, "Content must be at least 100 characters")
		.max(10000, "Content must be at most 10000 characters"),
	authors: z
		.array(authorSchema)
		.min(1, "At least one author is required")
		.max(10, "Maximum 10 authors allowed")
		.refine(
			(authors) => authors.filter((a) => a.isPresenter).length === 1,
			"Exactly one presenter is required",
		),
	keywords: z
		.array(
			z
				.string()
				.min(1, "Keyword cannot be empty")
				.max(50, "Keyword must be at most 50 characters"),
		)
		.min(1, "At least one keyword is required")
		.max(5, "Maximum 5 keywords allowed"),
});

export type AuthorInput = z.infer<typeof authorSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
