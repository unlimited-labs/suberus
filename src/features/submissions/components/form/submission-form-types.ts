import type { SubmissionTypeConfig } from "@/features/settings/types";
import type { Author } from "@/shared/types/author";

/** Active submission type from settings */
export interface ActiveSubmissionType {
	type: "ABSTRACT" | "POSTER" | "FULL_PAPER";
	label: string;
	config: SubmissionTypeConfig;
}

/** Validation settings from admin panel */
export interface ValidationSettings {
	minTitleLength: number;
	maxTitleLength: number;
	minAbstractLength: number;
	maxAbstractLength: number;
	minKeywords: number;
	maxKeywords: number;
	enableKeywords: boolean;
}

export interface SubmissionFormData {
	type: "ABSTRACT" | "POSTER" | "FULL_PAPER";
	title: string;
	content: string;
	authors: Author[];
	keywords: string[];
	file: File | null;
	contentFormat: "TEXT" | "FILE";
	trackId: string | null;
}
