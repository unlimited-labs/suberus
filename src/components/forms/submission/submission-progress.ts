import type {
	SubmissionFormData,
	ValidationSettings,
} from "./submission-form-types";

export interface SubmissionProgress {
	hasType: boolean;
	hasContent: boolean;
	hasAuthors: boolean;
	hasKeywords: boolean;
}

/** Per-section completion flags for the progress sidebar. */
export function computeSubmissionProgress(
	values: SubmissionFormData,
	settings: ValidationSettings,
	isFileFormat: boolean,
): SubmissionProgress {
	const hasType = !!values.type;
	const hasContent = isFileFormat
		? values.file !== null
		: values.title.length >= settings.minTitleLength &&
			values.content.length >= settings.minAbstractLength;
	const hasAuthors =
		values.authors.length > 0 &&
		values.authors.every(
			(a) => !!a.firstName && !!a.lastName && !!a.email && !!a.affiliationName,
		);
	const hasKeywords =
		!settings.enableKeywords || values.keywords.length >= settings.minKeywords;
	return { hasType, hasContent, hasAuthors, hasKeywords };
}
