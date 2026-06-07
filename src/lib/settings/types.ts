import type { ReviewMode } from "@/generated/prisma/enums";

/** Content format for submission types */
export type ContentFormat = "TEXT" | "FILE";

/** Configuration for a submission type stored as JSON in AppSetting */
export interface SubmissionTypeConfig {
	isActive: boolean;
	contentFormat: ContentFormat;
	allowedExtensions: string[]; // subset of SUPPORTED_FILE_EXTENSIONS, e.g. ["pdf", "docx"]
	requiredReviewers: number;
	reviewMode: ReviewMode;
	reviewDeadlineDays: number;
	requiresEditorDecision: boolean;
	enableScoring: boolean;
	scoringCriteria: { name: string; description: string }[];
	enableConfidenceLevel: boolean;
	enableReviewAttachment: boolean;
	enableTrackSelection: boolean;
}

/** Reminder settings for reviewer deadline reminders */
export interface ReviewerReminderSettings {
	enabled: boolean;
	daysBefore: number[]; // e.g. [3, 1] → send 3 days and 1 day before deadline
}

/** Reminder settings for revision nudges */
export interface RevisionReminderSettings {
	enabled: boolean;
	intervalDays: number; // e.g. 7 → remind every 7 days
	maxCount: number; // max reminders per submission
}

/** Reminder settings for submission deadline approaching */
export interface DeadlineReminderSettings {
	enabled: boolean;
	daysBefore: number[]; // e.g. [7, 3, 1] → send 7, 3, 1 day before deadline
}

/** Type map: AppSettingKey → value type */
export type AppSettingsMap = {
	// Conference settings
	CONFERENCE_NAME: string;
	CONFERENCE_SUBTITLE: string;
	CONFERENCE_DATE_START: string;
	CONFERENCE_DATE_END: string;
	SUBMISSION_DEADLINE: string;
	SUBMISSIONS_LOCKED: boolean;
	REVIEW_DEADLINE: string;
	NOTIFICATION_DATE: string;
	REGISTRATION_DEADLINE: string;
	REGISTRATION_LOCKED: boolean;
	CONTACT_EMAIL: string;
	CONFERENCE_LOCATION: string;
	CONFERENCE_WEBSITE: string;
	CONFERENCE_TIMEZONE: string;
	CONFERENCE_DAY_START: string; // "HH:mm" (24h), e.g. "09:00"
	CONFERENCE_DAY_END: string; // "HH:mm" (24h), e.g. "18:00"
	CONFERENCE_DEFAULT_PRESENTATION_MIN: number;
	PLANNER_AUTOPLAN_ENABLED: boolean;

	// Submission settings
	MIN_TITLE_LENGTH: number;
	MAX_TITLE_LENGTH: number;
	MIN_ABSTRACT_LENGTH: number;
	MAX_ABSTRACT_LENGTH: number;
	MAX_FILE_SIZE_MB: number;
	ALLOWED_FILE_TYPES: string[];
	MAX_AUTHORS: number;
	ENABLE_KEYWORDS: boolean;
	MIN_KEYWORDS: number;
	MAX_KEYWORDS: number;

	// Submission type configs
	SUBMISSION_TYPE_ORAL_PRESENTATION: SubmissionTypeConfig;
	SUBMISSION_TYPE_POSTER: SubmissionTypeConfig;
	SUBMISSION_TYPE_FULL_PAPER: SubmissionTypeConfig;

	// Fee settings
	FEE_PAYMENT_INSTRUCTIONS: string;
	FEE_CURRENCY: "EUR" | "USD" | "PLN";
	FEE_TYPES: Array<{ id: string; name: string; amount: number }>;

	// Extraction settings
	EXTRACTION_ENABLED: boolean;
	EXTRACTION_HEURISTIC: boolean;
	EXTRACTION_AI: boolean;

	// Service health (written by scheduled task)
	SERVICE_HEALTH_LLM: {
		status: "healthy" | "unavailable";
		message: string;
		gpu?: boolean;
		models?: string[];
		checkedAt: string;
	};
	SERVICE_HEALTH_DOCLING: {
		status: "healthy" | "unavailable";
		message: string;
		checkedAt: string;
	};
	SERVICE_HEALTH_PLANNER: {
		status: "healthy" | "unavailable";
		message: string;
		checkedAt: string;
	};

	// Branding settings
	BRANDING_LOGO_URL: string;
	BRANDING_FAVICON_URL: string;
	BRANDING_PRIMARY_COLOR: string;
	BRANDING_SECONDARY_COLOR: string;
	BRANDING_FOOTER_TEXT: string;
	BRANDING_AUTH_BACKGROUND_KEY: string;
	BRANDING_AUTH_BG_OVERLAY: number;
	BRANDING_LOGO_DARK_INVERT: boolean;

	// Reminder settings
	REMINDER_REVIEWER_SETTINGS: ReviewerReminderSettings;
	REMINDER_REVISION_SETTINGS: RevisionReminderSettings;
	REMINDER_DEADLINE_SETTINGS: DeadlineReminderSettings;

	// Guidelines
	SUBMISSION_GUIDELINES: string;
	REVIEW_GUIDELINES: string;

	// Email footer
	EMAIL_FOOTER_TEXT: string;

	// Terms of Service
	TOS_CONTENT: string;

	// Display format
	DATE_FORMAT: string;
	TIME_FORMAT: "24h" | "12h";

	// Invitations
	INVITATION_VALIDITY_HOURS: number;

	// Schedule planner
	SCHEDULE_STATE: {
		status: "DRAFT" | "DRAFT_PUBLISHED" | "PUBLISHED";
		publishedAt?: string;
		publishedBy?: string;
	};
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

/** Type-safe key derived from AppSettingsMap (single source of truth) */
export type AppSettingKey = keyof AppSettingsMap;
