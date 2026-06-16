import { FILE_ACCEPT_ATTRIBUTE } from "@/features/settings/file-types";
import type { UserSubmissionFile } from "@/features/submissions/server/submissions";

export interface RevisionFormData {
	title: string;
	content: string;
	comment: string;
	file: File | null;
}

export interface RevisionRequest {
	submissionId: string;
	title: string;
	content: string;
	comment: string | undefined;
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

/** Whether a submission type stores its content as an uploaded file. */
export function resolveIsFileFormat(
	typeConfig: { config: { contentFormat: string } } | undefined,
): boolean {
	return (typeConfig?.config.contentFormat ?? "TEXT") === "FILE";
}

/** The file-input `accept` attribute for a type's allowed extensions. */
export function buildAcceptString(allowedExtensions: string[]): string {
	return allowedExtensions.length > 0
		? allowedExtensions.map((ext) => `.${ext}`).join(",")
		: FILE_ACCEPT_ATTRIBUTE;
}

/** Normalizes form fields into the resubmit/conditional-revision request body. */
export function buildRevisionRequest(
	submissionId: string,
	formData: Pick<RevisionFormData, "title" | "content" | "comment">,
): RevisionRequest {
	return {
		submissionId,
		title: formData.title,
		content: formData.content,
		comment: formData.comment || undefined,
	};
}

interface RevisionTypeConfig {
	type: string;
	config: { contentFormat: string; allowedExtensions: string[] };
}

/** The subset of the submission-detail payload the revision view reads. */
interface RevisionViewData {
	submission: {
		type: string;
		status: string;
		title: string;
		content: string;
		currentVersion: number;
	};
	versions: {
		version: number;
		title: string;
		content: string;
		file: UserSubmissionFile | null;
	}[];
}

export interface RevisionView {
	isConditional: boolean;
	isFileFormat: boolean;
	title: string;
	content: string;
	currentFile: UserSubmissionFile | null;
	acceptString: string;
	maxFileSize: number;
}

/**
 * Resolves everything the revision form renders from the submission detail, type
 * config and validation settings: which version's title/content/file to seed,
 * the file-accept attribute, max size, and the conditional/file-format flags.
 * Null-safe so it can run before the page's not-revisable guard.
 */
export function prepareRevisionView(
	data: RevisionViewData | null,
	typeConfigs: RevisionTypeConfig[],
	validationSettings: { maxFileSize?: number | null },
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
		title: currentVersion?.title ?? submission?.title ?? "",
		content: currentVersion?.content ?? submission?.content ?? "",
		currentFile: currentVersion?.file ?? null,
		acceptString: buildAcceptString(typeConfig?.config.allowedExtensions ?? []),
		maxFileSize: validationSettings.maxFileSize ?? 10,
	};
}
