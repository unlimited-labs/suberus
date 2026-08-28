import type { ReviewMode } from "@/generated/prisma/enums";
import type { SupportedFileExtension } from "./file-types";

export type ContentFormat = "TEXT" | "FILE";

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

export interface ProgramQrSettings {
	errorCorrectionLevel: "L" | "M" | "Q" | "H";
	width: number;
	margin: number;
	format: "svg" | "png";
	/** Substitute short-link base, e.g. "https://short.dom/s". Empty = APP_BASE_URL + "/s". */
	baseUrl: string;
	includeWithoutCameraReady: boolean;
}

export interface ProgramBadge {
	id: string;
	label: string;
	color: string;
	style: "badge" | "ribbon";
}

export interface ReviewerReminderSettings {
	enabled: boolean;
	daysBefore: number[];
}

export interface RevisionReminderSettings {
	enabled: boolean;
	intervalDays: number;
	maxCount: number;
}

export interface DeadlineReminderSettings {
	enabled: boolean;
	daysBefore: number[];
}

/** Digital signature config for generated documents (stored as JSON in AppSetting).
 * null = signing was never configured. The password-protected P12 and its sealed
 * password are stored TOGETHER here (per database) so they can never drift out of
 * sync — see the comment on `p12Base64`. Neither is ever sent to the client. */
export interface DocumentSigningSettings {
	enabled: boolean;
	source: "self-signed" | "uploaded";
	subject: string;
	fingerprintSha256: string;
	validFrom: string;
	validUntil: string;
	/** secret-box ciphertext of the P12 password (never sent to the client). */
	passwordSealed: string;
	/** base64 of the password-protected P12 (private key + cert), never sent to the
	 * client. Stored here instead of a shared S3 key so the cert and its password
	 * stay atomic per-DB — a single global S3 object would be clobbered by any other
	 * environment/tenant sharing the bucket, desyncing it from this row's password. */
	p12Base64: string;
	timestampEnabled: boolean;
	timestampUrl: string;
	sealReason: string;
	sealCorner: "bottom-right" | "bottom-left" | "top-right" | "top-left";
	sealQrEnabled: boolean;
	/** Certifying (DocMDP) signature locks the PDF against further edits. */
	certifying: boolean;
}

/** Client-facing view: the private-key fields are replaced by a stored/not-stored flag. */
export type SafeSigningConfig = Omit<
	DocumentSigningSettings,
	"passwordSealed" | "p12Base64"
> & { hasP12: boolean };

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
	PLANNER_AUTHOR_BUFFER_MIN: number;
	PROGRAM_REMINDER_LEAD_MIN: number;

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

	FEE_ENABLED: boolean;
	FEE_PAYMENT_INSTRUCTIONS: string;
	FEE_CURRENCY: "EUR" | "USD" | "PLN";
	FEE_TYPES: Array<{ id: string; name: string; amount: number }>;

	FINANCES_ENABLED: boolean;
	FINANCES_VAT_RATES: Array<{ id: string; rate: number }>;
	FINANCES_CONTRACTORS: string[];

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
	BRANDING_LOGO_KEY: string;
	BRANDING_FAVICON_KEY: string;
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

	PROGRAM_THEME: string;
	PROGRAM_SHOW_AUTHOR_INFO: boolean;
	PROGRAM_QR: ProgramQrSettings;
	PROGRAM_BADGES: ProgramBadge[];

	DOCUMENT_SIGNING: DocumentSigningSettings | null;
};

export const SUBMISSION_TYPE_KEYS = [
	"SUBMISSION_TYPE_ORAL_PRESENTATION",
	"SUBMISSION_TYPE_POSTER",
	"SUBMISSION_TYPE_FULL_PAPER",
	"SUBMISSION_TYPE_EXHIBITOR",
] as const;

export type SubmissionTypeKey = (typeof SUBMISSION_TYPE_KEYS)[number];

export const SUBMISSION_TYPE_TO_KEY = {
	ABSTRACT: "SUBMISSION_TYPE_ORAL_PRESENTATION",
	POSTER: "SUBMISSION_TYPE_POSTER",
	FULL_PAPER: "SUBMISSION_TYPE_FULL_PAPER",
	EXHIBITOR: "SUBMISSION_TYPE_EXHIBITOR",
	// INVITED placeholders have no type config; every path reading this map is
	// gated off before they reach it. Mapped so the lookup stays total.
	INVITED: "SUBMISSION_TYPE_ORAL_PRESENTATION",
} as const;

export const SUBMISSION_TYPE_DISPLAY_NAMES = {
	SUBMISSION_TYPE_ORAL_PRESENTATION: "Oral Presentation",
	SUBMISSION_TYPE_POSTER: "Poster",
	SUBMISSION_TYPE_FULL_PAPER: "Full Paper",
	SUBMISSION_TYPE_EXHIBITOR: "Exhibitor",
} satisfies Record<SubmissionTypeKey, string>;

export type AppSettingKey = keyof AppSettingsMap;
