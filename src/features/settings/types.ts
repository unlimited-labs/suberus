import type { ReviewMode } from "@/generated/prisma/enums";
import type { SupportedFileExtension } from "./file-types";

/** Content format for submission types */
export type ContentFormat = "TEXT" | "FILE";

/** Configuration for a submission type stored as JSON in AppSetting */
export interface SubmissionTypeConfig {
	isActive: boolean;
	/** Accepted submissions of this type appear in the program planner (pool, create-session, capacity). */
	includeInPlanner: boolean;
	/** EXHIBITOR only: the exhibitor form offers an optional presentation section. */
	allowExhibitorPresentation: boolean;
	contentFormat: ContentFormat;
	allowedExtensions: SupportedFileExtension[];
	/** Max upload size in MB for this type's submission file (FILE format only). */
	maxFileSizeMb: number;
	/** Max submissions of this type a single user may have active. 0 = unlimited. Excludes co-authored submissions and DRAFT/WITHDRAWN/REJECTED. */
	maxSubmissionsPerUser: number;
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

	MIN_TITLE_LENGTH: number;
	MAX_TITLE_LENGTH: number;
	MIN_ABSTRACT_LENGTH: number;
	MAX_ABSTRACT_LENGTH: number;
	MAX_AUTHORS: number;
	ENABLE_KEYWORDS: boolean;
	MIN_KEYWORDS: number;
	MAX_KEYWORDS: number;

	SUBMISSION_TYPE_ORAL_PRESENTATION: SubmissionTypeConfig;
	SUBMISSION_TYPE_POSTER: SubmissionTypeConfig;
	SUBMISSION_TYPE_FULL_PAPER: SubmissionTypeConfig;
	SUBMISSION_TYPE_EXHIBITOR: SubmissionTypeConfig;

	FEE_PAYMENT_INSTRUCTIONS: string;
	FEE_CURRENCY: "EUR" | "USD" | "PLN";
	FEE_TYPES: Array<{ id: string; name: string; amount: number }>;

	EXTRACTION_ENABLED: boolean;
	EXTRACTION_HEURISTIC: boolean;
	EXTRACTION_AI: boolean;

	SERVICE_HEALTH_LLM: {
		status: "healthy" | "unavailable" | "misconfigured";
		message: string;
		gpu?: boolean;
		models?: string[];
		model?: string;
		checkedAt: string;
	};
	SERVICE_HEALTH_PDF_API: {
		status: "healthy" | "unavailable";
		message: string;
		checkedAt: string;
	};
	SERVICE_HEALTH_DOCX_API: {
		status: "healthy" | "unavailable";
		message: string;
		checkedAt: string;
	};
	SERVICE_HEALTH_PLANNER: {
		status: "healthy" | "unavailable";
		message: string;
		checkedAt: string;
	};

	BRANDING_LOGO_URL: string;
	BRANDING_FAVICON_URL: string;
	BRANDING_PRIMARY_COLOR: string;
	BRANDING_SECONDARY_COLOR: string;
	BRANDING_FOOTER_TEXT: string;
	BRANDING_AUTH_BACKGROUND_KEY: string;
	BRANDING_AUTH_BG_OVERLAY: number;
	BRANDING_LOGO_DARK_INVERT: boolean;

	REMINDER_REVIEWER_SETTINGS: ReviewerReminderSettings;
	REMINDER_REVISION_SETTINGS: RevisionReminderSettings;
	REMINDER_DEADLINE_SETTINGS: DeadlineReminderSettings;

	SUBMISSION_GUIDELINES: string;
	REVIEW_GUIDELINES: string;

	EMAIL_FOOTER_TEXT: string;

	TOS_CONTENT: string;

	DATE_FORMAT: string;
	TIME_FORMAT: "24h" | "12h";

	INVITATION_VALIDITY_HOURS: number;

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
	"SUBMISSION_TYPE_EXHIBITOR",
] as const;

export type SubmissionTypeKey = (typeof SUBMISSION_TYPE_KEYS)[number];

/** Map from SubmissionType enum to AppSettingKey */
export const SUBMISSION_TYPE_TO_KEY = {
	ABSTRACT: "SUBMISSION_TYPE_ORAL_PRESENTATION",
	POSTER: "SUBMISSION_TYPE_POSTER",
	FULL_PAPER: "SUBMISSION_TYPE_FULL_PAPER",
	EXHIBITOR: "SUBMISSION_TYPE_EXHIBITOR",
} as const;

/** Map from AppSettingKey to display name */
export const SUBMISSION_TYPE_DISPLAY_NAMES: Record<SubmissionTypeKey, string> =
	{
		SUBMISSION_TYPE_ORAL_PRESENTATION: "Oral Presentation",
		SUBMISSION_TYPE_POSTER: "Poster",
		SUBMISSION_TYPE_FULL_PAPER: "Full Paper",
		SUBMISSION_TYPE_EXHIBITOR: "Exhibitor",
	};

/** Type-safe key derived from AppSettingsMap (single source of truth) */
export type AppSettingKey = keyof AppSettingsMap;
