import type { AppSettingsMap, SubmissionTypeConfig } from "./types";

export const DEFAULT_ORAL_PRESENTATION_CONFIG: SubmissionTypeConfig = {
	isActive: false,
	includeInPlanner: true,
	allowExhibitorPresentation: false,
	contentFormat: "TEXT",
	allowedExtensions: [],
	maxFileSizeMb: 10,
	maxSubmissionsPerUser: 0,
	requiredReviewers: 1,
	reviewMode: "SINGLE_BLIND",
	reviewDeadlineDays: 14,
	requiresEditorDecision: false,

	enableScoring: false,
	scoringCriteria: [],
	enableConfidenceLevel: true,
	enableReviewAttachment: true,
	enableTrackSelection: false,
};

export const DEFAULT_POSTER_CONFIG: SubmissionTypeConfig = {
	isActive: false,
	includeInPlanner: true,
	allowExhibitorPresentation: false,
	contentFormat: "TEXT",
	allowedExtensions: [],
	maxFileSizeMb: 10,
	maxSubmissionsPerUser: 0,
	requiredReviewers: 1,
	reviewMode: "SINGLE_BLIND",
	reviewDeadlineDays: 14,
	requiresEditorDecision: false,

	enableScoring: false,
	scoringCriteria: [],
	enableConfidenceLevel: true,
	enableReviewAttachment: true,
	enableTrackSelection: false,
};

export const DEFAULT_FULL_PAPER_CONFIG: SubmissionTypeConfig = {
	isActive: false,
	includeInPlanner: false,
	allowExhibitorPresentation: false,
	contentFormat: "FILE",
	allowedExtensions: ["docx"],
	maxFileSizeMb: 10,
	maxSubmissionsPerUser: 0,
	requiredReviewers: 2,
	reviewMode: "DOUBLE_BLIND",
	reviewDeadlineDays: 21,
	requiresEditorDecision: true,

	enableScoring: true,
	scoringCriteria: [
		{ name: "Originality", description: "Contribution to the field" },
		{ name: "Clarity", description: "Writing quality and structure" },
		{ name: "Significance", description: "Importance and impact of the work" },
		{ name: "Methodology", description: "Research design and execution" },
		{ name: "Technical Quality", description: "Technical soundness and rigor" },
	],
	enableConfidenceLevel: true,
	enableReviewAttachment: true,
	enableTrackSelection: false,
};

export const DEFAULT_EXHIBITOR_CONFIG: SubmissionTypeConfig = {
	isActive: false,
	includeInPlanner: true,
	allowExhibitorPresentation: false,
	contentFormat: "TEXT",
	allowedExtensions: [],
	maxFileSizeMb: 10,
	maxSubmissionsPerUser: 0,
	requiredReviewers: 0,
	reviewMode: "OPEN",
	reviewDeadlineDays: 14,
	requiresEditorDecision: false,
	enableScoring: false,
	scoringCriteria: [],
	enableConfidenceLevel: false,
	enableReviewAttachment: false,
	enableTrackSelection: false,
};

export const APP_SETTINGS_DEFAULTS: AppSettingsMap = {
	CONFERENCE_NAME: "Conference Name",
	CONFERENCE_SUBTITLE: "",
	CONFERENCE_DATE_START: "",
	CONFERENCE_DATE_END: "",
	SUBMISSION_DEADLINE: "",
	SUBMISSIONS_LOCKED: false,
	REVIEW_DEADLINE: "",
	NOTIFICATION_DATE: "",
	REGISTRATION_DEADLINE: "",
	REGISTRATION_LOCKED: false,
	CONTACT_EMAIL: "",
	CONFERENCE_LOCATION: "",
	CONFERENCE_WEBSITE: "",
	CONFERENCE_TIMEZONE: "",
	CONFERENCE_DAY_START: "09:00",
	CONFERENCE_DAY_END: "18:00",
	CONFERENCE_DEFAULT_PRESENTATION_MIN: 15,
	PLANNER_AUTOPLAN_ENABLED: false,
	PLANNER_AUTHOR_BUFFER_MIN: 15,
	PROGRAM_REMINDER_LEAD_MIN: 5,

	MIN_TITLE_LENGTH: 10,
	MAX_TITLE_LENGTH: 200,
	MIN_ABSTRACT_LENGTH: 500,
	MAX_ABSTRACT_LENGTH: 2000,
	MAX_AUTHORS: 10,
	ENABLE_KEYWORDS: true,
	MIN_KEYWORDS: 3,
	MAX_KEYWORDS: 5,

	EXTRACTION_ENABLED: false,
	EXTRACTION_HEURISTIC: true,
	EXTRACTION_AI: false,

	SERVICE_HEALTH_LLM: {
		status: "unavailable",
		message: "Not checked yet",
		checkedAt: "",
	},
	SERVICE_HEALTH_PDF_API: {
		status: "unavailable",
		message: "Not checked yet",
		checkedAt: "",
	},
	SERVICE_HEALTH_DOCX_API: {
		status: "unavailable",
		message: "Not checked yet",
		checkedAt: "",
	},
	SERVICE_HEALTH_PLANNER: {
		status: "unavailable",
		message: "Not checked yet",
		checkedAt: "",
	},

	SUBMISSION_TYPE_ORAL_PRESENTATION: DEFAULT_ORAL_PRESENTATION_CONFIG,
	SUBMISSION_TYPE_POSTER: DEFAULT_POSTER_CONFIG,
	SUBMISSION_TYPE_FULL_PAPER: DEFAULT_FULL_PAPER_CONFIG,
	SUBMISSION_TYPE_EXHIBITOR: DEFAULT_EXHIBITOR_CONFIG,

	FEE_ENABLED: true,
	FEE_PAYMENT_INSTRUCTIONS:
		"# Payment Instructions\n\nPlease contact the conference organizer for payment details.",
	FEE_CURRENCY: "EUR",
	FEE_TYPES: [
		{ id: "full", name: "Full Conference Fee", amount: 250 },
		{ id: "student", name: "Student Fee", amount: 100 },
	],

	FINANCES_ENABLED: false,
	FINANCES_VAT_RATES: [
		{ id: "vat-8", rate: 8 },
		{ id: "vat-23", rate: 23 },
	],
	FINANCES_CONTRACTORS: [],

	BRANDING_LOGO_URL: "",
	BRANDING_FAVICON_URL: "",
	BRANDING_LOGO_KEY: "",
	BRANDING_FAVICON_KEY: "",
	BRANDING_PRIMARY_COLOR: "#3b82f6",
	BRANDING_SECONDARY_COLOR: "#8b5cf6",
	BRANDING_FOOTER_TEXT: "",
	BRANDING_AUTH_BACKGROUND_KEY: "",
	BRANDING_AUTH_BG_OVERLAY: 60,
	BRANDING_LOGO_DARK_INVERT: true,

	REMINDER_REVIEWER_SETTINGS: { enabled: false, daysBefore: [3, 1] },
	REMINDER_REVISION_SETTINGS: { enabled: false, intervalDays: 7, maxCount: 3 },
	REMINDER_DEADLINE_SETTINGS: { enabled: false, daysBefore: [7, 3, 1] },

	SUBMISSION_GUIDELINES:
		"- Title should be concise and descriptive\n- Abstract minimum {{minAbstractLength}} characters\n- At least one author required\n- Add {{minKeywords}}-{{maxKeywords}} relevant keywords",
	REVIEW_GUIDELINES:
		"- Provide constructive, specific feedback\n- Support claims with evidence from the work\n- Be respectful and professional\n- Consider the work's contribution to the field\n- Minimum 50 characters for comments",

	EMAIL_FOOTER_TEXT: "Best regards,\n{{conferenceName}}",

	TOS_CONTENT:
		"# Terms of Service\n\nPlease configure Terms of Service in the admin panel.",

	DATE_FORMAT: "DD.MM.YYYY",
	TIME_FORMAT: "24h",

	INVITATION_VALIDITY_HOURS: 72,

	SCHEDULE_STATE: { status: "DRAFT" },

	PROGRAM_THEME: "default",
	PROGRAM_SHOW_AUTHOR_INFO: false,
	PROGRAM_QR: {
		errorCorrectionLevel: "M",
		width: 512,
		margin: 4,
		format: "svg",
		baseUrl: "",
		includeWithoutCameraReady: true,
	},

	DOCUMENT_SIGNING: null,
};

export function getDefaultSetting<K extends keyof AppSettingsMap>(
	key: K,
): AppSettingsMap[K] {
	return APP_SETTINGS_DEFAULTS[key];
}
