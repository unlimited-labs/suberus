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
	scoringCriteria: [
		{ name: "Originality", description: "Contribution to the field" },
		{ name: "Clarity", description: "Writing quality and structure" },
		{ name: "Significance", description: "Importance and impact of the work" },
		{ name: "Methodology", description: "Research design and execution" },
	],
	enableConfidenceLevel: true,
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
	enableConfidenceLevel: true,
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
		{ name: "Originality", description: "Contribution to the field" },
		{ name: "Clarity", description: "Writing quality and structure" },
		{ name: "Significance", description: "Importance and impact of the work" },
		{ name: "Methodology", description: "Research design and execution" },
		{ name: "Technical Quality", description: "Technical soundness and rigor" },
	],
	enableConfidenceLevel: true,
	enableSessionSelection: false,
};

/** Default values for all app settings */
export const APP_SETTINGS_DEFAULTS: AppSettingsMap = {
	// Conference settings
	CONFERENCE_NAME: "Conference Name",
	CONFERENCE_SUBTITLE: "",
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
	FEE_CURRENCY: "EUR",
	FEE_TYPES: [
		{ id: "full", name: "Full Conference Fee", amount: 250 },
		{ id: "student", name: "Student Fee", amount: 100 },
	],

	// Branding settings
	BRANDING_LOGO_URL: "",
	BRANDING_FAVICON_URL: "",
	BRANDING_PRIMARY_COLOR: "#3b82f6",
	BRANDING_SECONDARY_COLOR: "#8b5cf6",
	BRANDING_FOOTER_TEXT: "",
	BRANDING_AUTH_BACKGROUND_KEY: "",
	BRANDING_AUTH_BG_OVERLAY: 60,
	BRANDING_LOGO_DARK_INVERT: true,

	// Reminder settings
	REMINDER_REVIEWER_SETTINGS: { enabled: false, daysBefore: [3, 1] },
	REMINDER_REVISION_SETTINGS: { enabled: false, intervalDays: 7, maxCount: 3 },
	REMINDER_DEADLINE_SETTINGS: { enabled: false, daysBefore: [7, 3, 1] },

	// Guidelines
	SUBMISSION_GUIDELINES:
		"- Title should be concise and descriptive\n- Abstract minimum {{minAbstractLength}} characters\n- At least one author required\n- Add {{minKeywords}}-{{maxKeywords}} relevant keywords",
	REVIEW_GUIDELINES:
		"- Provide constructive, specific feedback\n- Support claims with evidence from the work\n- Be respectful and professional\n- Consider the work's contribution to the field\n- Minimum 50 characters for comments",

	// Email footer
	EMAIL_FOOTER_TEXT: "",

	// Terms of Service
	TOS_CONTENT:
		"# Terms of Service\n\nPlease configure Terms of Service in the admin panel.",

	// Display format
	DATE_FORMAT: "DD.MM.YYYY",
	TIME_FORMAT: "24h",

	// Invitations
	INVITATION_VALIDITY_HOURS: 72,
};

/** Get default value for a setting key */
export function getDefaultSetting<K extends keyof AppSettingsMap>(
	key: K,
): AppSettingsMap[K] {
	return APP_SETTINGS_DEFAULTS[key];
}
