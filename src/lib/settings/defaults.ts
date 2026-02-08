import type { AppSettingsMap, SubmissionTypeConfig } from "./types";

/** Default config for Oral Presentation (TEXT-based) */
export const DEFAULT_ORAL_PRESENTATION_CONFIG: SubmissionTypeConfig = {
	isActive: true,
	contentFormat: "TEXT",
	allowedExtensions: [],
	minReviewers: 2,
	maxReviewers: 3,
	reviewMode: "DOUBLE_BLIND",
	reviewDeadlineDays: 14,
	requiresEditorDecision: true,
	autoTransitionAfterReviews: true,
	allowRevisions: true,
	enableScoring: true,
	scoringCriteria: ["Originality", "Clarity", "Significance", "Methodology"],
	enableSessionSelection: false,
};

/** Default config for Poster (TEXT-based) */
export const DEFAULT_POSTER_CONFIG: SubmissionTypeConfig = {
	isActive: true,
	contentFormat: "TEXT",
	allowedExtensions: [],
	minReviewers: 1,
	maxReviewers: 2,
	reviewMode: "SINGLE_BLIND",
	reviewDeadlineDays: 7,
	requiresEditorDecision: false,
	autoTransitionAfterReviews: true,
	allowRevisions: false,
	enableScoring: false,
	scoringCriteria: [],
	enableSessionSelection: false,
};

/** Default config for Full Paper (FILE-based) */
export const DEFAULT_FULL_PAPER_CONFIG: SubmissionTypeConfig = {
	isActive: true,
	contentFormat: "FILE",
	allowedExtensions: ["pdf", "doc", "docx"],
	minReviewers: 3,
	maxReviewers: 4,
	reviewMode: "DOUBLE_BLIND",
	reviewDeadlineDays: 21,
	requiresEditorDecision: true,
	autoTransitionAfterReviews: false,
	allowRevisions: true,
	enableScoring: true,
	scoringCriteria: [
		"Originality",
		"Clarity",
		"Significance",
		"Methodology",
		"Technical Quality",
	],
	enableSessionSelection: false,
};

/** Default values for all app settings */
export const APP_SETTINGS_DEFAULTS: AppSettingsMap = {
	// Conference settings
	CONFERENCE_NAME: "Conference Name",
	CONFERENCE_DATE_START: "",
	CONFERENCE_DATE_END: "",
	SUBMISSION_DEADLINE: "",
	REVIEW_DEADLINE: "",
	NOTIFICATION_DATE: "",
	CONTACT_EMAIL: "",
	CONFERENCE_LOCATION: "",
	CONFERENCE_WEBSITE: "",

	// Submission settings
	MIN_TITLE_LENGTH: 10,
	MAX_TITLE_LENGTH: 200,
	MIN_ABSTRACT_LENGTH: 500,
	MAX_ABSTRACT_LENGTH: 2000,
	MAX_FILE_SIZE_MB: 10,
	ALLOWED_FILE_TYPES: ["pdf", "doc", "docx"],
	MAX_AUTHORS: 10,
	REQUIRE_ORCID: false,
	ENABLE_KEYWORDS: true,
	MIN_KEYWORDS: 3,
	MAX_KEYWORDS: 5,

	// Submission type configs
	SUBMISSION_TYPE_ORAL_PRESENTATION: DEFAULT_ORAL_PRESENTATION_CONFIG,
	SUBMISSION_TYPE_POSTER: DEFAULT_POSTER_CONFIG,
	SUBMISSION_TYPE_FULL_PAPER: DEFAULT_FULL_PAPER_CONFIG,

	// Fee settings
	FEE_PAYMENT_INSTRUCTIONS:
		"# Payment Instructions\n\nPlease contact the conference organizer for payment details.",

	// Branding settings
	BRANDING_LOGO_URL: "",
	BRANDING_FAVICON_URL: "",
	BRANDING_PRIMARY_COLOR: "#3b82f6",
	BRANDING_SECONDARY_COLOR: "#8b5cf6",
	BRANDING_FOOTER_TEXT: "",
};

/** Get default value for a setting key */
export function getDefaultSetting<K extends keyof AppSettingsMap>(
	key: K,
): AppSettingsMap[K] {
	return APP_SETTINGS_DEFAULTS[key];
}
