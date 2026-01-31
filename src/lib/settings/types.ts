import type { AppSettingKey, ReviewMode } from "@/generated/prisma/enums";

/** Content format for submission types */
export type ContentFormat = "TEXT" | "FILE";

/** Configuration for a submission type stored as JSON in AppSetting */
export interface SubmissionTypeConfig {
	isActive: boolean;
	contentFormat: ContentFormat;
	allowedExtensions: string[]; // e.g., ["pdf", "doc", "docx"]
	minReviewers: number;
	maxReviewers: number;
	reviewMode: ReviewMode;
	reviewDeadlineDays: number;
	requiresEditorDecision: boolean;
	allowRevisions: boolean;
	maxRevisions: number;
	enableScoring: boolean;
	scoringCriteria: string[];
}

/** Type map: AppSettingKey → value type */
export type AppSettingsMap = {
	// Conference settings
	CONFERENCE_NAME: string;
	CONFERENCE_DATE_START: string;
	CONFERENCE_DATE_END: string;
	SUBMISSION_DEADLINE: string;
	REVIEW_DEADLINE: string;
	NOTIFICATION_DATE: string;
	CONTACT_EMAIL: string;
	CONFERENCE_LOCATION: string;
	CONFERENCE_WEBSITE: string;

	// Submission settings
	MIN_TITLE_LENGTH: number;
	MAX_TITLE_LENGTH: number;
	MIN_ABSTRACT_LENGTH: number;
	MAX_ABSTRACT_LENGTH: number;
	MAX_FILE_SIZE_MB: number;
	ALLOWED_FILE_TYPES: string[];
	MAX_AUTHORS: number;
	REQUIRE_ORCID: boolean;
	ENABLE_KEYWORDS: boolean;
	MIN_KEYWORDS: number;
	MAX_KEYWORDS: number;

	// Submission type configs
	SUBMISSION_TYPE_ORAL_PRESENTATION: SubmissionTypeConfig;
	SUBMISSION_TYPE_POSTER: SubmissionTypeConfig;
	SUBMISSION_TYPE_FULL_PAPER: SubmissionTypeConfig;
};

/** Keys for submission type configs */
export const SUBMISSION_TYPE_KEYS = [
	"SUBMISSION_TYPE_ORAL_PRESENTATION",
	"SUBMISSION_TYPE_POSTER",
	"SUBMISSION_TYPE_FULL_PAPER",
] as const;

export type SubmissionTypeKey = (typeof SUBMISSION_TYPE_KEYS)[number];

/** Map from SubmissionType enum to AppSettingKey */
export const SUBMISSION_TYPE_TO_KEY = {
	ABSTRACT: "SUBMISSION_TYPE_ORAL_PRESENTATION",
	POSTER: "SUBMISSION_TYPE_POSTER",
	FULL_PAPER: "SUBMISSION_TYPE_FULL_PAPER",
} as const;

/** Map from AppSettingKey to display name */
export const SUBMISSION_TYPE_DISPLAY_NAMES: Record<SubmissionTypeKey, string> =
	{
		SUBMISSION_TYPE_ORAL_PRESENTATION: "Oral Presentation",
		SUBMISSION_TYPE_POSTER: "Poster",
		SUBMISSION_TYPE_FULL_PAPER: "Full Paper",
	};

/** Helper to extract SubmissionType from key */
export function getSubmissionTypeFromKey(
	key: SubmissionTypeKey,
): "ABSTRACT" | "POSTER" | "FULL_PAPER" {
	switch (key) {
		case "SUBMISSION_TYPE_ORAL_PRESENTATION":
			return "ABSTRACT";
		case "SUBMISSION_TYPE_POSTER":
			return "POSTER";
		case "SUBMISSION_TYPE_FULL_PAPER":
			return "FULL_PAPER";
	}
}

/** Type-safe key for AppSettingsMap */
export type AppSettingKeyType = keyof AppSettingsMap;

/** Ensure AppSettingKeyType matches Prisma enum */
export type _ValidateKeys = AppSettingKeyType extends AppSettingKey
	? AppSettingKey extends AppSettingKeyType
		? true
		: never
	: never;
