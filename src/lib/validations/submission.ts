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
	email: z.email("Invalid email address"),
	affiliationId: z.uuid().nullable(),
	affiliationName: z
		.string()
		.min(1, "Affiliation is required")
		.max(200, "Affiliation must be at most 200 characters"),
	isPresenter: z.boolean(),
});

/** Validation settings for dynamic schema creation */
export interface ValidationLimits {
	minTitleLength: number;
	maxTitleLength: number;
	minAbstractLength: number;
	maxAbstractLength: number;
	minKeywords: number;
	maxKeywords: number;
	enableKeywords: boolean;
}

/** Default validation limits (used as fallback) */
export const DEFAULT_VALIDATION_LIMITS: ValidationLimits = {
	minTitleLength: 10,
	maxTitleLength: 200,
	minAbstractLength: 500,
	maxAbstractLength: 2000,
	minKeywords: 3,
	maxKeywords: 5,
	enableKeywords: true,
};

/** Creates a dynamic submission schema based on validation settings */
export function createDynamicSubmissionSchema(limits: ValidationLimits) {
	const keywordSchema = z
		.string()
		.min(1, "Keyword cannot be empty")
		.max(50, "Keyword must be at most 50 characters");

	const keywordsArraySchema = limits.enableKeywords
		? z
				.array(keywordSchema)
				.min(
					limits.minKeywords,
					`At least ${limits.minKeywords} keyword${limits.minKeywords === 1 ? " is" : "s are"} required`,
				)
				.max(
					limits.maxKeywords,
					`Maximum ${limits.maxKeywords} keywords allowed`,
				)
		: z.array(keywordSchema).max(limits.maxKeywords);

	const baseSchema = z.object({
		type: z.enum(["ABSTRACT", "POSTER", "FULL_PAPER"]),
		title: z
			.string()
			.min(
				limits.minTitleLength,
				`Title must be at least ${limits.minTitleLength} characters`,
			)
			.max(
				limits.maxTitleLength,
				`Title must be at most ${limits.maxTitleLength} characters`,
			),
		content: z.string(),
		authors: z
			.array(authorSchema)
			.min(1, "At least one author is required")
			.refine(
				(authors) => authors.filter((a) => a.isPresenter).length === 1,
				"Exactly one presenter is required",
			),
		keywords: keywordsArraySchema,
		contentFormat: z.enum(["TEXT", "FILE"]),
		trackId: z.uuid().nullish(),
	});

	// Add content length validation for TEXT format
	return baseSchema
		.refine(
			(data) => {
				if (data.contentFormat === "TEXT") {
					return data.content.length >= limits.minAbstractLength;
				}
				return true;
			},
			{
				message: `Content must be at least ${limits.minAbstractLength} characters`,
				path: ["content"],
			},
		)
		.refine(
			(data) => {
				if (data.contentFormat === "TEXT") {
					return data.content.length <= limits.maxAbstractLength;
				}
				return true;
			},
			{
				message: `Content must be at most ${limits.maxAbstractLength} characters`,
				path: ["content"],
			},
		);
}

// Legacy static schemas (kept for backwards compatibility)
export const createSubmissionSchema = z.object({
	type: z.enum(["ABSTRACT", "POSTER", "FULL_PAPER"]),
	title: z
		.string()
		.min(5, "Title must be at least 5 characters")
		.max(300, "Title must be at most 300 characters"),
	content: z.string().max(10000, "Content must be at most 10000 characters"),
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
	// Content format determines what is required
	contentFormat: z.enum(["TEXT", "FILE"]),
	trackId: z.uuid().nullable().optional(),
});

/** Schema for TEXT-based submissions (requires content) */
export const textSubmissionSchema = createSubmissionSchema.refine(
	(data) => {
		if (data.contentFormat === "TEXT") {
			return data.content.length >= 100;
		}
		return true;
	},
	{
		message: "Content must be at least 100 characters",
		path: ["content"],
	},
);

export type AuthorInput = z.infer<typeof authorSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
