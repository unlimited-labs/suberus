import { FILE_ACCEPT_ATTRIBUTE } from "@/features/settings/file-types";
import type {
	UserSubmissionAuthor,
	UserSubmissionFile,
} from "@/features/submissions/server/submissions";
import type { Author } from "@/shared/types/author";

export interface RevisionFormData {
	title: string;
	content: string;
	comment: string;
	file: File | null;
	authors: Author[];
	keywords: string[];
}

export interface RevisionRequest {
	submissionId: string;
	title: string;
	content: string;
	comment: string | undefined;
	authors: Author[];
	keywords: string[];
}

function toFormAuthors(authors: UserSubmissionAuthor[]): Author[] {
	return authors.map((a) => ({
		firstName: a.firstName,
		lastName: a.lastName,
		email: a.email,
		affiliationId: null,
		affiliationName: a.affiliation,
		isPresenter: a.isPresenter,
	}));
}

/** A submission is revisable only from these editor-requested states. */
export function canReviseSubmission(status: string): boolean {
	return status === "REVISE_REQUIRED" || status === "CONDITIONALLY_ACCEPTED";
}

/** Whether the viewer may revise: an author (not co-author) in a revisable state. */
export function isRevisableSubmission(submission: {
	role: string;
	status: string;
}): boolean {
	return (
		submission.role !== "coauthor" && canReviseSubmission(submission.status)
	);
}

/**
 * Whether a revision is ready to submit: a non-empty title and a valid author
 * composition (at least one author, exactly one presenter, and every author has
 * the required fields). Mirrors the initial-submission author rules.
 */
export function revisionReady(title: string, authors: Author[]): boolean {
	if (!title.trim()) return false;
	if (authors.length === 0) return false;
	if (authors.filter((a) => a.isPresenter).length !== 1) return false;
	return authors.every(
		(a) =>
			a.firstName.trim() !== "" &&
			a.lastName.trim() !== "" &&
			a.email.trim() !== "" &&
			a.affiliationName.trim() !== "",
	);
}

export function resolveIsFileFormat(
	typeConfig: { config: { contentFormat: string } } | undefined,
): boolean {
	return (typeConfig?.config.contentFormat ?? "TEXT") === "FILE";
}

export function buildAcceptString(allowedExtensions: string[]): string {
	return allowedExtensions.length > 0
		? allowedExtensions.map((ext) => `.${ext}`).join(",")
		: FILE_ACCEPT_ATTRIBUTE;
}

export function buildRevisionRequest(
	submissionId: string,
	formData: RevisionFormData,
): RevisionRequest {
	return {
		submissionId,
		title: formData.title,
		content: formData.content,
		comment: formData.comment || undefined,
		authors: formData.authors,
		keywords: formData.keywords,
	};
}

interface RevisionTypeConfig {
	type: string;
	config: {
		contentFormat: string;
		allowedExtensions: string[];
		maxFileSizeMb?: number;
	};
}

interface RevisionViewData {
	submission: {
		type: string;
		status: string;
		title: string;
		content: string;
		currentVersion: number;
		authors: UserSubmissionAuthor[];
		keywords: string[];
	};
	versions: {
		version: number;
		title: string;
		content: string;
		file: UserSubmissionFile | null;
		authors: UserSubmissionAuthor[];
		keywords: string[];
	}[];
}

export interface RevisionViewSettings {
	enableKeywords: boolean;
	maxKeywords: number;
	extractionEnabled: boolean;
}

export interface RevisionView {
	isConditional: boolean;
	isFileFormat: boolean;
	title: string;
	content: string;
	currentFile: UserSubmissionFile | null;
	acceptString: string;
	maxFileSize: number;
	authors: Author[];
	keywords: string[];
	enableKeywords: boolean;
	maxKeywords: number;
	extractionEnabled: boolean;
}

// fallow-ignore-next-line complexity -- nullish-fallback chains read clearly; CRAP inflated by estimated 0 coverage (covered by revise-helpers.test.ts)
function resolveRevisionSeed(
	currentVersion: RevisionViewData["versions"][number] | undefined,
	submission: RevisionViewData["submission"] | undefined,
): Pick<
	RevisionView,
	"title" | "content" | "currentFile" | "authors" | "keywords"
> {
	return {
		title: currentVersion?.title ?? submission?.title ?? "",
		content: currentVersion?.content ?? submission?.content ?? "",
		currentFile: currentVersion?.file ?? null,
		authors: toFormAuthors(
			currentVersion?.authors ?? submission?.authors ?? [],
		),
		keywords: currentVersion?.keywords ?? submission?.keywords ?? [],
	};
}

/**
 * Resolves everything the revision form renders from the submission detail and
 * type config: the seeded title/content/file/authors/keywords, the file-accept
 * attribute, max size (from the type config), the keyword/extraction settings,
 * and the conditional/file-format flags. Null-safe so it can run before the
 * page's not-revisable guard.
 */
export function prepareRevisionView(
	data: RevisionViewData | null,
	typeConfigs: RevisionTypeConfig[],
	settings: RevisionViewSettings,
): RevisionView {
	const submission = data?.submission;
	const typeConfig = submission
		? typeConfigs.find((t) => t.type === submission.type)
		: undefined;
	const currentVersion = data?.versions.find(
		(v) => v.version === submission?.currentVersion,
	);

	return {
		isConditional: submission?.status === "CONDITIONALLY_ACCEPTED",
		isFileFormat: resolveIsFileFormat(typeConfig),
		acceptString: buildAcceptString(typeConfig?.config.allowedExtensions ?? []),
		maxFileSize: typeConfig?.config.maxFileSizeMb ?? 10,
		...resolveRevisionSeed(currentVersion, submission),
		enableKeywords: settings.enableKeywords,
		maxKeywords: settings.maxKeywords,
		extractionEnabled: settings.extractionEnabled,
	};
}
