import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
	AppSettingsMap,
	DeadlineReminderSettings,
	ReviewerReminderSettings,
	RevisionReminderSettings,
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/lib/settings/types";
import { adminMiddleware, authMiddleware } from "./auth.middleware";
import {
	getActiveSubmissionTypes,
	getSetting,
	getSettings,
	getSubmissionTypeConfigs,
	setSetting,
} from "./settings.server";

// Schema for submission type config
const submissionTypeConfigSchema = z.object({
	isActive: z.boolean(),
	contentFormat: z.enum(["TEXT", "FILE"]),
	allowedExtensions: z.array(z.string()),
	minReviewers: z.number().int().min(1).max(10),
	maxReviewers: z.number().int().min(1).max(10),
	reviewMode: z.enum(["OPEN", "SINGLE_BLIND", "DOUBLE_BLIND"]),
	reviewDeadlineDays: z.number().int().min(1).max(90),
	requiresEditorDecision: z.boolean(),
	autoTransitionAfterReviews: z.boolean(),
	allowRevisions: z.boolean(),
	enableScoring: z.boolean(),
	scoringCriteria: z.array(
		z.object({ name: z.string(), description: z.string() }),
	),
	enableConfidenceLevel: z.boolean(),
	enableTrackSelection: z.boolean(),
});

export const activeSubmissionTypesQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "submission-types-active"],
		queryFn: () => getActiveSubmissionTypesFn(),
	});

export const submissionValidationQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "submission-validation-form"],
		queryFn: () => getSubmissionValidationForFormFn(),
	});

export const submissionGuidelinesQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "submission-guidelines"],
		queryFn: () => getSubmissionGuidelinesFn(),
	});

export const reviewGuidelinesQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "review-guidelines"],
		queryFn: () => getReviewGuidelinesFn(),
	});

export const submissionDeadlineQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "submission-deadline"],
		queryFn: () => getSubmissionDeadlineFn(),
	});

export const conferenceSettingsQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "conference"],
		queryFn: () => getConferenceSettingsFn(),
	});

export const brandingSettingsQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "branding"],
		queryFn: () => getBrandingSettingsFn(),
	});

export const submissionTypesConfigQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "submission-types-config"],
		queryFn: () => getSubmissionTypeConfigsFn(),
	});

export const submissionValidationSettingsQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "submission-validation"],
		queryFn: () => getSubmissionValidationSettingsFn(),
	});

export const adminSettingQueryOptions = <K extends keyof AppSettingsMap>(
	key: K,
) =>
	queryOptions({
		queryKey: ["settings", "admin", key],
		queryFn: () =>
			getSettingFn({ data: { key } }) as Promise<AppSettingsMap[K]>,
	});

export const reminderSettingsQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "reminders"],
		queryFn: () => getReminderSettingsFn(),
	});

export const emailFooterQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "email-footer"],
		queryFn: () => getEmailFooterFn(),
	});

/**
 * Get a single setting (admin only)
 */
export const getSettingFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ key: z.string() }))
	.handler(async ({ data }) => {
		return getSetting(data.key as keyof AppSettingsMap);
	});

/**
 * Set a single setting (admin only)
 */
export const setSettingFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			key: z.string(),
			value: z.unknown(),
		}),
	)
	.handler(async ({ data }) => {
		await setSetting(
			data.key as keyof AppSettingsMap,
			data.value as AppSettingsMap[keyof AppSettingsMap],
		);
		return { success: true };
	});

/**
 * Get multiple settings (admin only)
 */
export const getSettingsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ keys: z.array(z.string()) }))
	.handler(async ({ data }) => {
		return getSettings(data.keys as Array<keyof AppSettingsMap>);
	});

/**
 * Get all submission type configs (admin only)
 */
export const getSubmissionTypeConfigsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getSubmissionTypeConfigs();
	});

/**
 * Update a submission type config (admin only)
 */
export const updateSubmissionTypeConfigFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			type: z.enum([
				"SUBMISSION_TYPE_ORAL_PRESENTATION",
				"SUBMISSION_TYPE_POSTER",
				"SUBMISSION_TYPE_FULL_PAPER",
			]),
			config: submissionTypeConfigSchema,
		}),
	)
	.handler(async ({ data }) => {
		// Validate FILE format has at least one extension
		if (
			data.config.contentFormat === "FILE" &&
			data.config.allowedExtensions.length === 0
		) {
			throw new Response(
				"FILE format requires at least one allowed extension",
				{ status: 400 },
			);
		}

		if (data.config.minReviewers > data.config.maxReviewers) {
			throw new Response("Min reviewers cannot exceed max reviewers", {
				status: 400,
			});
		}

		if (data.config.enableScoring && data.config.scoringCriteria.length === 0) {
			throw new Response("Scoring requires at least one criterion", {
				status: 400,
			});
		}

		await setSetting(
			data.type as SubmissionTypeKey,
			data.config as SubmissionTypeConfig,
		);
		return { success: true };
	});

/**
 * Get active submission types for form (public - requires auth)
 */
export const getActiveSubmissionTypesFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getActiveSubmissionTypes();
	});

/** Conference settings shape */
export interface ConferenceSettings {
	name: string;
	location: string;
	website: string;
	contactEmail: string;
	conferenceStartDate: string;
	conferenceEndDate: string;
	submissionDeadline: string;
	reviewDeadline: string;
	notificationDate: string;
	subtitle: string;
	dateFormat: string;
	timeFormat: "24h" | "12h";
	currency: "EUR" | "USD" | "PLN";
}

const conferenceSettingsSchema = z.object({
	name: z.string().min(1, "Name required").max(200),
	location: z.string().max(200),
	website: z.union([z.literal(""), z.url()]),
	contactEmail: z.union([z.literal(""), z.email()]),
	conferenceStartDate: z.string(),
	conferenceEndDate: z.string(),
	submissionDeadline: z.string(),
	reviewDeadline: z.string(),
	notificationDate: z.string(),
	subtitle: z.string(),
	dateFormat: z.string(),
	timeFormat: z.enum(["24h", "12h"]),
	currency: z.enum(["EUR", "USD", "PLN"]),
});

/**
 * Get submission guidelines (public - requires auth)
 */
export const getSubmissionGuidelinesFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("SUBMISSION_GUIDELINES");
	});

/**
 * Get review guidelines (public - requires auth)
 */
export const getReviewGuidelinesFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("REVIEW_GUIDELINES");
	});

/**
 * Get email footer text (admin only)
 */
export const getEmailFooterFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getSetting("EMAIL_FOOTER_TEXT");
	});

/**
 * Update email footer text (admin only)
 */
export const updateEmailFooterFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ value: z.string() }))
	.handler(async ({ data }) => {
		await setSetting("EMAIL_FOOTER_TEXT", data.value);
		return { success: true };
	});

/**
 * Update submission guidelines (admin only)
 */
export const updateSubmissionGuidelinesFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ value: z.string() }))
	.handler(async ({ data }) => {
		await setSetting("SUBMISSION_GUIDELINES", data.value);
		return { success: true };
	});

/**
 * Update review guidelines (admin only)
 */
export const updateReviewGuidelinesFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ value: z.string() }))
	.handler(async ({ data }) => {
		await setSetting("REVIEW_GUIDELINES", data.value);
		return { success: true };
	});

/** Submission validation settings shape */
export interface SubmissionValidationSettings {
	minTitleLength: number;
	maxTitleLength: number;
	minAbstractLength: number;
	maxAbstractLength: number;
	minKeywords: number;
	maxKeywords: number;
	maxFileSize: number;
	enableKeywords: boolean;
	allowedFileTypes: string[];
}

/**
 * Get submission validation settings (admin only)
 */
export const getSubmissionValidationSettingsFn = createServerFn({
	method: "GET",
})
	.middleware([adminMiddleware])
	.handler(async (): Promise<SubmissionValidationSettings> => {
		const settings = await getSettings([
			"MIN_TITLE_LENGTH",
			"MAX_TITLE_LENGTH",
			"MIN_ABSTRACT_LENGTH",
			"MAX_ABSTRACT_LENGTH",
			"MIN_KEYWORDS",
			"MAX_KEYWORDS",
			"MAX_FILE_SIZE_MB",
			"ENABLE_KEYWORDS",
			"ALLOWED_FILE_TYPES",
		]);
		return {
			minTitleLength: settings.MIN_TITLE_LENGTH,
			maxTitleLength: settings.MAX_TITLE_LENGTH,
			minAbstractLength: settings.MIN_ABSTRACT_LENGTH,
			maxAbstractLength: settings.MAX_ABSTRACT_LENGTH,
			minKeywords: settings.MIN_KEYWORDS,
			maxKeywords: settings.MAX_KEYWORDS,
			maxFileSize: settings.MAX_FILE_SIZE_MB,
			enableKeywords: settings.ENABLE_KEYWORDS,
			allowedFileTypes: settings.ALLOWED_FILE_TYPES,
		};
	});

/**
 * Get conference settings (admin only)
 */
export const getConferenceSettingsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async (): Promise<ConferenceSettings> => {
		const settings = await getSettings([
			"CONFERENCE_NAME",
			"CONFERENCE_LOCATION",
			"CONFERENCE_WEBSITE",
			"CONTACT_EMAIL",
			"CONFERENCE_DATE_START",
			"CONFERENCE_DATE_END",
			"SUBMISSION_DEADLINE",
			"REVIEW_DEADLINE",
			"NOTIFICATION_DATE",
			"CONFERENCE_SUBTITLE",
			"DATE_FORMAT",
			"TIME_FORMAT",
			"FEE_CURRENCY",
		]);
		return {
			name: settings.CONFERENCE_NAME,
			location: settings.CONFERENCE_LOCATION,
			website: settings.CONFERENCE_WEBSITE,
			contactEmail: settings.CONTACT_EMAIL,
			conferenceStartDate: settings.CONFERENCE_DATE_START,
			conferenceEndDate: settings.CONFERENCE_DATE_END,
			submissionDeadline: settings.SUBMISSION_DEADLINE,
			reviewDeadline: settings.REVIEW_DEADLINE,
			notificationDate: settings.NOTIFICATION_DATE,
			subtitle: settings.CONFERENCE_SUBTITLE,
			dateFormat: settings.DATE_FORMAT,
			timeFormat: settings.TIME_FORMAT,
			currency: settings.FEE_CURRENCY,
		};
	});

/**
 * Update conference settings (admin only)
 */
export const updateConferenceSettingsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(conferenceSettingsSchema)
	.handler(async ({ data }) => {
		await setSetting("CONFERENCE_NAME", data.name);
		await setSetting("CONFERENCE_LOCATION", data.location);
		await setSetting("CONFERENCE_WEBSITE", data.website);
		await setSetting("CONTACT_EMAIL", data.contactEmail);
		await setSetting("CONFERENCE_DATE_START", data.conferenceStartDate);
		await setSetting("CONFERENCE_DATE_END", data.conferenceEndDate);
		await setSetting("SUBMISSION_DEADLINE", data.submissionDeadline);
		await setSetting("REVIEW_DEADLINE", data.reviewDeadline);
		await setSetting("NOTIFICATION_DATE", data.notificationDate);
		await setSetting("CONFERENCE_SUBTITLE", data.subtitle);
		await setSetting("DATE_FORMAT", data.dateFormat);
		await setSetting("TIME_FORMAT", data.timeFormat);
		await setSetting("FEE_CURRENCY", data.currency);
		return { success: true };
	});

/**
 * Get conference name (public - requires auth)
 */
export const getConferenceNameFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		const name = await getSetting("CONFERENCE_NAME");
		return { conferenceName: name };
	});

/**
 * Update submission validation settings (admin only)
 */
export const updateSubmissionValidationSettingsFn = createServerFn({
	method: "POST",
})
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			minTitleLength: z.number().int().min(1).max(500),
			maxTitleLength: z.number().int().min(10).max(1000),
			minAbstractLength: z.number().int().min(0).max(10000),
			maxAbstractLength: z.number().int().min(100).max(50000),
			minKeywords: z.number().int().min(0).max(20),
			maxKeywords: z.number().int().min(1).max(20),
			maxFileSize: z.number().int().min(1).max(100),
			enableKeywords: z.boolean(),
			allowedFileTypes: z.array(z.string()),
		}),
	)
	.handler(async ({ data }) => {
		// Validate min <= max
		if (data.minTitleLength > data.maxTitleLength) {
			throw new Response("Min title length cannot exceed max title length", {
				status: 400,
			});
		}
		if (data.minAbstractLength > data.maxAbstractLength) {
			throw new Response(
				"Min abstract length cannot exceed max abstract length",
				{
					status: 400,
				},
			);
		}
		if (data.minKeywords > data.maxKeywords) {
			throw new Response("Min keywords cannot exceed max keywords", {
				status: 400,
			});
		}

		await setSetting("MIN_TITLE_LENGTH", data.minTitleLength);
		await setSetting("MAX_TITLE_LENGTH", data.maxTitleLength);
		await setSetting("MIN_ABSTRACT_LENGTH", data.minAbstractLength);
		await setSetting("MAX_ABSTRACT_LENGTH", data.maxAbstractLength);
		await setSetting("MIN_KEYWORDS", data.minKeywords);
		await setSetting("MAX_KEYWORDS", data.maxKeywords);
		await setSetting("MAX_FILE_SIZE_MB", data.maxFileSize);
		await setSetting("ENABLE_KEYWORDS", data.enableKeywords);
		await setSetting("ALLOWED_FILE_TYPES", data.allowedFileTypes);

		return { success: true };
	});

/**
 * Get submission validation settings for form (public - requires auth)
 */
export const getSubmissionValidationForFormFn = createServerFn({
	method: "GET",
})
	.middleware([authMiddleware])
	.handler(async () => {
		const settings = await getSettings([
			"MIN_TITLE_LENGTH",
			"MAX_TITLE_LENGTH",
			"MIN_ABSTRACT_LENGTH",
			"MAX_ABSTRACT_LENGTH",
			"MIN_KEYWORDS",
			"MAX_KEYWORDS",
			"MAX_FILE_SIZE_MB",
			"ALLOWED_FILE_TYPES",
			"ENABLE_KEYWORDS",
		]);
		return {
			minTitleLength: settings.MIN_TITLE_LENGTH,
			maxTitleLength: settings.MAX_TITLE_LENGTH,
			minAbstractLength: settings.MIN_ABSTRACT_LENGTH,
			maxAbstractLength: settings.MAX_ABSTRACT_LENGTH,
			minKeywords: settings.MIN_KEYWORDS,
			maxKeywords: settings.MAX_KEYWORDS,
			maxFileSize: settings.MAX_FILE_SIZE_MB,
			allowedFileTypes: settings.ALLOWED_FILE_TYPES,
			enableKeywords: settings.ENABLE_KEYWORDS,
		};
	});

/**
 * Get submission deadline (public - requires auth)
 */
export const getSubmissionDeadlineFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		const deadline = await getSetting("SUBMISSION_DEADLINE");
		return { deadline };
	});

/** Branding settings shape */
export interface BrandingSettings {
	logoUrl: string;
	faviconUrl: string;
	primaryColor: string;
	secondaryColor: string;
	footerText: string;
	authBackgroundUrl: string;
	authBgOverlay: number;
	logoDarkInvert: boolean;
}

/** App branding + conference name (for _app loader) */
export interface AppBranding extends BrandingSettings {
	conferenceName: string;
	dateFormat: string;
	timeFormat: "24h" | "12h";
}

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

const brandingSchema = z.object({
	logoUrl: z.string().max(500),
	faviconUrl: z.string().max(500),
	primaryColor: z.string().regex(hexColorRegex, "Invalid hex color"),
	secondaryColor: z.string().regex(hexColorRegex, "Invalid hex color"),
	footerText: z.string().max(500),
	authBgOverlay: z.number().int().min(0).max(100),
	logoDarkInvert: z.boolean(),
});

/**
 * Get app branding + conference name (public, no auth).
 * Used by _app loader for SSR — no FOUC.
 */
export const getAppBrandingFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<AppBranding> => {
		const settings = await getSettings([
			"CONFERENCE_NAME",
			"BRANDING_LOGO_URL",
			"BRANDING_FAVICON_URL",
			"BRANDING_PRIMARY_COLOR",
			"BRANDING_SECONDARY_COLOR",
			"BRANDING_FOOTER_TEXT",
			"BRANDING_LOGO_DARK_INVERT",
			"DATE_FORMAT",
			"TIME_FORMAT",
		]);
		return {
			conferenceName: settings.CONFERENCE_NAME,
			logoUrl: settings.BRANDING_LOGO_URL,
			faviconUrl: settings.BRANDING_FAVICON_URL,
			primaryColor: settings.BRANDING_PRIMARY_COLOR,
			secondaryColor: settings.BRANDING_SECONDARY_COLOR,
			footerText: settings.BRANDING_FOOTER_TEXT,
			authBackgroundUrl: "",
			authBgOverlay: 60,
			logoDarkInvert: settings.BRANDING_LOGO_DARK_INVERT,
			dateFormat: settings.DATE_FORMAT,
			timeFormat: settings.TIME_FORMAT,
		};
	},
);

/**
 * Get branding settings (admin only) — for admin settings page.
 */
export const getBrandingSettingsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async (): Promise<BrandingSettings> => {
		const { getAuthBackgroundUrl } = await import("./branding.server");
		const [settings, authBackgroundUrl] = await Promise.all([
			getSettings([
				"BRANDING_LOGO_URL",
				"BRANDING_FAVICON_URL",
				"BRANDING_PRIMARY_COLOR",
				"BRANDING_SECONDARY_COLOR",
				"BRANDING_FOOTER_TEXT",
				"BRANDING_AUTH_BG_OVERLAY",
				"BRANDING_LOGO_DARK_INVERT",
			]),
			getAuthBackgroundUrl(),
		]);
		return {
			logoUrl: settings.BRANDING_LOGO_URL,
			faviconUrl: settings.BRANDING_FAVICON_URL,
			primaryColor: settings.BRANDING_PRIMARY_COLOR,
			secondaryColor: settings.BRANDING_SECONDARY_COLOR,
			footerText: settings.BRANDING_FOOTER_TEXT,
			authBackgroundUrl,
			authBgOverlay: settings.BRANDING_AUTH_BG_OVERLAY,
			logoDarkInvert: settings.BRANDING_LOGO_DARK_INVERT,
		};
	});

/**
 * Update branding settings (admin only)
 */
export const updateBrandingSettingsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(brandingSchema)
	.handler(async ({ data }) => {
		await setSetting("BRANDING_LOGO_URL", data.logoUrl);
		await setSetting("BRANDING_FAVICON_URL", data.faviconUrl);
		await setSetting("BRANDING_PRIMARY_COLOR", data.primaryColor);
		await setSetting("BRANDING_SECONDARY_COLOR", data.secondaryColor);
		await setSetting("BRANDING_FOOTER_TEXT", data.footerText);
		await setSetting("BRANDING_AUTH_BG_OVERLAY", data.authBgOverlay);
		await setSetting("BRANDING_LOGO_DARK_INVERT", data.logoDarkInvert);
		return { success: true };
	});

/**
 * Upload auth background image (admin only)
 */
export const uploadAuthBackgroundFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			fileBase64: z.string(),
			mimeType: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		const { uploadAuthBackground, getAuthBackgroundUrl } = await import(
			"./branding.server"
		);
		const buffer = Buffer.from(data.fileBase64, "base64");
		await uploadAuthBackground(buffer, data.mimeType);
		const url = await getAuthBackgroundUrl();
		return { url };
	});

/**
 * Delete auth background image (admin only)
 */
export const deleteAuthBackgroundFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.handler(async () => {
		const { deleteAuthBackground } = await import("./branding.server");
		await deleteAuthBackground();
		return { success: true };
	});

/** Auth page branding (public, no auth) */
export interface AuthPageBranding {
	conferenceName: string;
	logoUrl: string;
	primaryColor: string;
	secondaryColor: string;
	conferenceStartDate: string;
	conferenceEndDate: string;
	conferenceLocation: string;
	conferenceSubtitle: string;
	authBackgroundUrl: string;
	authBgOverlay: number;
	logoDarkInvert: boolean;
	dateFormat: string;
}

/**
 * Get primary color (public, no auth).
 * Used by root route for pre-hydration loader.
 */
export const getPrimaryColorFn = createServerFn({ method: "GET" }).handler(
	async () => {
		return await getSetting("BRANDING_PRIMARY_COLOR");
	},
);

/**
 * Get auth page branding (public, no auth).
 * Used by _auth layout for SSR — login/register pages.
 */
export const getAuthPageBrandingFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthPageBranding> => {
		const { getAuthBackgroundUrl } = await import("./branding.server");
		const [s, authBackgroundUrl] = await Promise.all([
			getSettings([
				"CONFERENCE_NAME",
				"BRANDING_LOGO_URL",
				"BRANDING_PRIMARY_COLOR",
				"BRANDING_SECONDARY_COLOR",
				"CONFERENCE_DATE_START",
				"CONFERENCE_DATE_END",
				"CONFERENCE_LOCATION",
				"CONFERENCE_SUBTITLE",
				"BRANDING_AUTH_BG_OVERLAY",
				"BRANDING_LOGO_DARK_INVERT",
				"DATE_FORMAT",
			]),
			getAuthBackgroundUrl(),
		]);
		return {
			conferenceName: s.CONFERENCE_NAME,
			logoUrl: s.BRANDING_LOGO_URL,
			primaryColor: s.BRANDING_PRIMARY_COLOR,
			secondaryColor: s.BRANDING_SECONDARY_COLOR,
			conferenceStartDate: s.CONFERENCE_DATE_START,
			conferenceEndDate: s.CONFERENCE_DATE_END,
			conferenceLocation: s.CONFERENCE_LOCATION,
			conferenceSubtitle: s.CONFERENCE_SUBTITLE,
			authBackgroundUrl,
			authBgOverlay: s.BRANDING_AUTH_BG_OVERLAY,
			logoDarkInvert: s.BRANDING_LOGO_DARK_INVERT,
			dateFormat: s.DATE_FORMAT,
		};
	},
);

/**
 * Update fee payment instructions (admin only)
 */
export const updateFeeInstructionsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ content: z.string().min(1) }))
	.handler(async ({ data }) => {
		await setSetting("FEE_PAYMENT_INSTRUCTIONS", data.content);
		return { success: true };
	});

/**
 * Update Terms of Service content (admin only)
 */
export const updateTosContentFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ content: z.string().min(1) }))
	.handler(async ({ data }) => {
		await setSetting("TOS_CONTENT", data.content);
		return { success: true };
	});

/** Reminder settings shape */
export interface ReminderSettings {
	reviewer: ReviewerReminderSettings;
	revision: RevisionReminderSettings;
	deadline: DeadlineReminderSettings;
}

/**
 * Get reminder settings (admin only)
 */
export const getReminderSettingsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async (): Promise<ReminderSettings> => {
		const settings = await getSettings([
			"REMINDER_REVIEWER_SETTINGS",
			"REMINDER_REVISION_SETTINGS",
			"REMINDER_DEADLINE_SETTINGS",
		]);
		return {
			reviewer: settings.REMINDER_REVIEWER_SETTINGS,
			revision: settings.REMINDER_REVISION_SETTINGS,
			deadline: settings.REMINDER_DEADLINE_SETTINGS,
		};
	});

const daysBeforeSchema = z
	.array(z.number().int().min(1).max(365))
	.min(1)
	.max(10);

const reminderSettingsSchema = z.object({
	reviewer: z.object({
		enabled: z.boolean(),
		daysBefore: daysBeforeSchema,
	}),
	revision: z.object({
		enabled: z.boolean(),
		intervalDays: z.number().int().min(1).max(365),
		maxCount: z.number().int().min(1).max(50),
	}),
	deadline: z.object({
		enabled: z.boolean(),
		daysBefore: daysBeforeSchema,
	}),
});

/**
 * Update reminder settings (admin only)
 */
export const updateReminderSettingsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(reminderSettingsSchema)
	.handler(async ({ data }) => {
		await setSetting("REMINDER_REVIEWER_SETTINGS", data.reviewer);
		await setSetting("REMINDER_REVISION_SETTINGS", data.revision);
		await setSetting("REMINDER_DEADLINE_SETTINGS", data.deadline);
		return { success: true };
	});

// ── Fee types & currency ──────────────────────────────────────

export const feeTypesQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "fee-types"],
		queryFn: () => getFeeTypesFn(),
	});

export const feeCurrencyQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "fee-currency"],
		queryFn: () => getFeeCurrencyFn(),
	});

/**
 * Get fee types (requires auth — used by admin + user fee page)
 */
export const getFeeTypesFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("FEE_TYPES");
	});

/**
 * Get fee currency (requires auth)
 */
export const getFeeCurrencyFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("FEE_CURRENCY");
	});

const feeTypeItemSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	amount: z.number().min(0),
});

/**
 * Update fee types (admin only)
 */
export const updateFeeTypesFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ feeTypes: z.array(feeTypeItemSchema).min(1) }))
	.handler(async ({ data }) => {
		await setSetting("FEE_TYPES", data.feeTypes);
		return { success: true };
	});
