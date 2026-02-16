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
	autoTransitionAfterReviews: boolean;
	allowRevisions: boolean;
	enableScoring: boolean;
	scoringCriteria: { name: string; description: string }[];
	enableConfidenceLevel: boolean;
	enableSessionSelection: boolean;
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

	// Fee settings
	FEE_PAYMENT_INSTRUCTIONS: string;
	FEE_CURRENCY: "EUR" | "USD" | "PLN";
	FEE_TYPES: Array<{ id: string; name: string; amount: number }>;

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

/** Ensure AppSettingsMap keys match Prisma AppSettingKey enum exactly.
 *  If keys diverge, one of these becomes `never` → TS error on the Record below. */
type _KeysMatch = [
	AppSettingKeyType extends AppSettingKey ? true : never,
	AppSettingKey extends AppSettingKeyType ? true : never,
];
export const APP_SETTING_KEYS_VALID: _KeysMatch = [true, true];
