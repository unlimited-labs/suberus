import { z } from "zod";
import { acknowledgmentSchema } from "@/features/submissions/validations";
import type { ValidationSettings } from "./submission-form-types";

/**
 * Form-level validation schema. Intentionally looser than
 * `createDynamicSubmissionSchema` in lib/validations: content length is
 * validated separately (see buildContentSchema) and disabled for FILE format,
 * and keyword count is enforced by the keywords input — not here.
 *
 * `hasExistingFile` relaxes the file requirement when a file is already attached
 * server-side (editing a FILE draft), so a metadata-only edit isn't blocked.
 */
export function buildSubmissionFormSchema(
	settings: ValidationSettings,
	hasExistingFile = false,
) {
	return z
		.object({
			type: z.enum(["ABSTRACT", "POSTER", "FULL_PAPER"]),
			title: z
				.string()
				.min(
					settings.minTitleLength,
					`Title must be at least ${settings.minTitleLength} characters`,
				)
				.max(
					settings.maxTitleLength,
					`Title must be at most ${settings.maxTitleLength} characters`,
				),
			content: z.string(),
			acknowledgment: acknowledgmentSchema,
			authors: z
				.array(
					z.object({
						firstName: z.string(),
						lastName: z.string(),
						email: z.string(),
						affiliationId: z.string().nullable(),
						affiliationName: z.string(),
						isPresenter: z.boolean(),
					}),
				)
				.refine(
					(authors) => authors.every((a) => a.firstName.length > 0),
					"First name is required for all authors",
				)
				.refine(
					(authors) => authors.every((a) => a.lastName.length > 0),
					"Last name is required for all authors",
				)
				.refine(
					(authors) => authors.every((a) => a.email.length > 0),
					"Email is required for all authors",
				)
				.refine(
					(authors) => authors.every((a) => a.affiliationName.length > 0),
					"Affiliation is required for all authors",
				),
			keywords: z.array(z.string()),
			file: z.custom<File | null>(),
			contentFormat: z.enum(["TEXT", "FILE"]),
			trackId: z.string().nullable(),
		})
		.refine(
			(data) =>
				data.contentFormat !== "FILE" ||
				hasExistingFile ||
				data.file instanceof File,
			{ message: "A file is required", path: ["file"] },
		);
}

/** Abstract-length schema, applied to the content field for TEXT format only. */
export function buildContentSchema(settings: ValidationSettings) {
	return z.object({
		content: z
			.string()
			.min(
				settings.minAbstractLength,
				`Abstract must be at least ${settings.minAbstractLength} characters`,
			)
			.max(
				settings.maxAbstractLength,
				`Abstract must be at most ${settings.maxAbstractLength} characters`,
			),
	});
}

export function substituteGuidelines(
	text: string,
	settings: ValidationSettings,
): string {
	return text
		.replace(/\{\{minTitleLength\}\}/g, String(settings.minTitleLength))
		.replace(/\{\{maxTitleLength\}\}/g, String(settings.maxTitleLength))
		.replace(/\{\{minAbstractLength\}\}/g, String(settings.minAbstractLength))
		.replace(/\{\{maxAbstractLength\}\}/g, String(settings.maxAbstractLength))
		.replace(/\{\{minKeywords\}\}/g, String(settings.minKeywords))
		.replace(/\{\{maxKeywords\}\}/g, String(settings.maxKeywords));
}
