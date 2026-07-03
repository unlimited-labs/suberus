import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { env } from "@/env";
import {
	adminMiddleware,
	adminOnlyMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import { getDefaultSetting } from "@/features/settings/defaults";
import { SUPPORTED_FILE_EXTENSIONS } from "@/features/settings/file-types";
import {
	deleteAuthBackground,
	deleteBrandingFavicon,
	deleteBrandingLogo,
	getAuthBackgroundUrl,
	getBrandingFaviconUrl,
	getBrandingLogoUrl,
	uploadAuthBackground,
	uploadBrandingFavicon,
	uploadBrandingLogo,
} from "@/features/settings/server/branding";
import {
	getActiveSubmissionTypes,
	getSetting,
	getSettings,
	getSubmissionTypeConfigs,
	setSetting,
} from "@/features/settings/server/settings";
import type {
	AppSettingsMap,
	DeadlineReminderSettings,
	ReviewerReminderSettings,
	RevisionReminderSettings,
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/features/settings/types";
import { isDeadlinePassed } from "@/shared/lib/deadline";
import { zIanaTz } from "@/shared/lib/validations/zod-helpers";
import { prisma } from "@/shared/server/db.server";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";

const submissionTypeConfigSchema = z.object({
	isActive: z.boolean(),
	includeInPlanner: z.boolean(),
	allowExhibitorPresentation: z.boolean(),
	contentFormat: z.enum(["TEXT", "FILE"]),
	allowedExtensions: z.array(z.enum(SUPPORTED_FILE_EXTENSIONS)).max(1),
	maxFileSizeMb: z.number().int().min(1).max(100),
	maxSubmissionsPerUser: z.number().int().min(0).max(1000),
	requiredReviewers: z.number().int().min(0).max(10),
	reviewMode: z.enum(["OPEN", "SINGLE_BLIND", "DOUBLE_BLIND"]),
	reviewDeadlineDays: z.number().int().min(1).max(90),
	requiresEditorDecision: z.boolean(),
	enableScoring: z.boolean(),
	scoringCriteria: z.array(
		z.object({ name: z.string(), description: z.string() }),
	),
	enableConfidenceLevel: z.boolean(),
	enableReviewAttachment: z.boolean(),
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
	.validator(z.object({ key: z.string() }))
	.handler(async ({ data }) => {
		return getSetting(data.key as keyof AppSettingsMap);
	});

/**
 * Set a single setting (admin only)
 */
export const setSettingFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(
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
	.middleware([adminOnlyMiddleware])
	.validator(
		z.object({
			type: z.enum([
				"SUBMISSION_TYPE_ORAL_PRESENTATION",
				"SUBMISSION_TYPE_POSTER",
				"SUBMISSION_TYPE_FULL_PAPER",
				"SUBMISSION_TYPE_EXHIBITOR",
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

		if (data.config.enableScoring && data.config.scoringCriteria.length === 0) {
			throw new Response("Scoring requires at least one criterion", {
				status: 400,
			});
		}

		// Only EXHIBITOR (never reviewed) may have zero required reviewers
		if (
			data.type !== "SUBMISSION_TYPE_EXHIBITOR" &&
			data.config.requiredReviewers < 1
		) {
			throw new Response("At least one reviewer is required", { status: 400 });
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
	submissionsLocked: boolean;
	reviewDeadline: string;
	notificationDate: string;
	registrationDeadline: string;
	registrationLocked: boolean;
	subtitle: string;
	dateFormat: string;
	timeFormat: "24h" | "12h";
	currency: "EUR" | "USD" | "PLN";
	timezone: string;
	dayStart: string;
	dayEnd: string;
	defaultPresentationMin: number;
	autoplanEnabled: boolean;
}

const conferenceSettingsSchema = z.object({
	name: z.string().min(1, "Name required").max(200),
	location: z.string().max(200),
	website: z.union([z.literal(""), z.httpUrl()]),
	contactEmail: z.union([z.literal(""), z.email()]),
	conferenceStartDate: z.string(),
	conferenceEndDate: z.string(),
	submissionDeadline: z.string(),
	submissionsLocked: z.boolean(),
	reviewDeadline: z.string(),
	notificationDate: z.string(),
	registrationDeadline: z.string(),
	registrationLocked: z.boolean(),
	subtitle: z.string(),
	dateFormat: z.string(),
	timeFormat: z.enum(["24h", "12h"]),
	currency: z.enum(["EUR", "USD", "PLN"]),
	timezone: zIanaTz,
	dayStart: z.iso.time({ precision: -1, error: "Expected HH:mm" }),
	dayEnd: z.iso.time({ precision: -1, error: "Expected HH:mm" }),
	defaultPresentationMin: z.number().int().min(5).max(480),
	autoplanEnabled: z.boolean(),
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
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ value: z.string() }))
	.handler(async ({ data }) => {
		await setSetting("EMAIL_FOOTER_TEXT", data.value);
		return { success: true };
	});

/**
 * Update submission guidelines (admin only)
 */
export const updateSubmissionGuidelinesFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ value: z.string() }))
	.handler(async ({ data }) => {
		await setSetting("SUBMISSION_GUIDELINES", data.value);
		return { success: true };
	});

/**
 * Update review guidelines (admin only)
 */
export const updateReviewGuidelinesFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ value: z.string() }))
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
	enableKeywords: boolean;
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
			"ENABLE_KEYWORDS",
		]);
		return {
			minTitleLength: settings.MIN_TITLE_LENGTH,
			maxTitleLength: settings.MAX_TITLE_LENGTH,
			minAbstractLength: settings.MIN_ABSTRACT_LENGTH,
			maxAbstractLength: settings.MAX_ABSTRACT_LENGTH,
			minKeywords: settings.MIN_KEYWORDS,
			maxKeywords: settings.MAX_KEYWORDS,
			enableKeywords: settings.ENABLE_KEYWORDS,
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
			"SUBMISSIONS_LOCKED",
			"REVIEW_DEADLINE",
			"NOTIFICATION_DATE",
			"REGISTRATION_DEADLINE",
			"REGISTRATION_LOCKED",
			"CONFERENCE_SUBTITLE",
			"DATE_FORMAT",
			"TIME_FORMAT",
			"FEE_CURRENCY",
			"CONFERENCE_TIMEZONE",
			"CONFERENCE_DAY_START",
			"CONFERENCE_DAY_END",
			"CONFERENCE_DEFAULT_PRESENTATION_MIN",
			"PLANNER_AUTOPLAN_ENABLED",
		]);
		return {
			name: settings.CONFERENCE_NAME,
			location: settings.CONFERENCE_LOCATION,
			website: settings.CONFERENCE_WEBSITE,
			contactEmail: settings.CONTACT_EMAIL,
			conferenceStartDate: settings.CONFERENCE_DATE_START,
			conferenceEndDate: settings.CONFERENCE_DATE_END,
			submissionDeadline: settings.SUBMISSION_DEADLINE,
			submissionsLocked: settings.SUBMISSIONS_LOCKED,
			reviewDeadline: settings.REVIEW_DEADLINE,
			notificationDate: settings.NOTIFICATION_DATE,
			registrationDeadline: settings.REGISTRATION_DEADLINE,
			registrationLocked: settings.REGISTRATION_LOCKED,
			subtitle: settings.CONFERENCE_SUBTITLE,
			dateFormat: settings.DATE_FORMAT,
			timeFormat: settings.TIME_FORMAT,
			currency: settings.FEE_CURRENCY,
			timezone: settings.CONFERENCE_TIMEZONE,
			dayStart: settings.CONFERENCE_DAY_START,
			dayEnd: settings.CONFERENCE_DAY_END,
			defaultPresentationMin: settings.CONFERENCE_DEFAULT_PRESENTATION_MIN,
			autoplanEnabled: settings.PLANNER_AUTOPLAN_ENABLED,
		};
	});

/**
 * Update conference settings (admin only)
 */
export const updateConferenceSettingsFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(conferenceSettingsSchema)
	.handler(async ({ data }) => {
		await Promise.all([
			setSetting("CONFERENCE_NAME", data.name),
			setSetting("CONFERENCE_LOCATION", data.location),
			setSetting("CONFERENCE_WEBSITE", data.website),
			setSetting("CONTACT_EMAIL", data.contactEmail),
			setSetting("CONFERENCE_DATE_START", data.conferenceStartDate),
			setSetting("CONFERENCE_DATE_END", data.conferenceEndDate),
			setSetting("SUBMISSION_DEADLINE", data.submissionDeadline),
			setSetting("SUBMISSIONS_LOCKED", data.submissionsLocked),
			setSetting("REVIEW_DEADLINE", data.reviewDeadline),
			setSetting("NOTIFICATION_DATE", data.notificationDate),
			setSetting("REGISTRATION_DEADLINE", data.registrationDeadline),
			setSetting("REGISTRATION_LOCKED", data.registrationLocked),
			setSetting("CONFERENCE_SUBTITLE", data.subtitle),
			setSetting("DATE_FORMAT", data.dateFormat),
			setSetting("TIME_FORMAT", data.timeFormat),
			setSetting("FEE_CURRENCY", data.currency),
			setSetting("CONFERENCE_TIMEZONE", data.timezone),
			setSetting("CONFERENCE_DAY_START", data.dayStart),
			setSetting("CONFERENCE_DAY_END", data.dayEnd),
			setSetting(
				"CONFERENCE_DEFAULT_PRESENTATION_MIN",
				data.defaultPresentationMin,
			),
			setSetting("PLANNER_AUTOPLAN_ENABLED", data.autoplanEnabled),
		]);
		return { success: true };
	});

/**
 * Update submission validation settings (admin only)
 */
export const updateSubmissionValidationSettingsFn = createServerFn({
	method: "POST",
})
	.middleware([adminOnlyMiddleware])
	.validator(
		z.object({
			minTitleLength: z.number().int().min(1).max(500),
			maxTitleLength: z.number().int().min(10).max(1000),
			minAbstractLength: z.number().int().min(0).max(10000),
			maxAbstractLength: z.number().int().min(100).max(50000),
			minKeywords: z.number().int().min(0).max(20),
			maxKeywords: z.number().int().min(1).max(20),
			enableKeywords: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
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
		await setSetting("ENABLE_KEYWORDS", data.enableKeywords);

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
			"ENABLE_KEYWORDS",
		]);
		return {
			minTitleLength: settings.MIN_TITLE_LENGTH,
			maxTitleLength: settings.MAX_TITLE_LENGTH,
			minAbstractLength: settings.MIN_ABSTRACT_LENGTH,
			maxAbstractLength: settings.MAX_ABSTRACT_LENGTH,
			minKeywords: settings.MIN_KEYWORDS,
			maxKeywords: settings.MAX_KEYWORDS,
			enableKeywords: settings.ENABLE_KEYWORDS,
		};
	});

/**
 * Get submission deadline + lock status (public - requires auth)
 */
export const getSubmissionDeadlineFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const [deadline, locked, timezone, canBypass] = await Promise.all([
			getSetting("SUBMISSION_DEADLINE"),
			getSetting("SUBMISSIONS_LOCKED"),
			getSetting("CONFERENCE_TIMEZONE"),
			prisma.user
				.findUnique({
					where: { id: context.user.id },
					select: { allowLateSubmission: true },
				})
				.then((u) => u?.allowLateSubmission ?? false),
		]);
		return { deadline, locked, canBypass, timezone };
	});

/**
 * Get registration status (public, no auth — needed on register page)
 */
export const getRegistrationStatusFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const [deadline, locked, timezone] = await Promise.all([
		getSetting("REGISTRATION_DEADLINE"),
		getSetting("REGISTRATION_LOCKED"),
		getSetting("CONFERENCE_TIMEZONE"),
	]);
	const deadlinePassed = deadline
		? isDeadlinePassed(deadline, timezone, new Date())
		: false;
	return { closed: locked || deadlinePassed, locked, deadlinePassed };
});

/** Branding settings shape */
export interface BrandingSettings {
	logoUrl: string;
	faviconUrl: string;
	/** Presigned URL of an uploaded logo; takes precedence over logoUrl. Empty if none. */
	logoUploadUrl: string;
	/** Presigned URL of an uploaded favicon; takes precedence over faviconUrl. Empty if none. */
	faviconUploadUrl: string;
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
		const [settings, logoUploadUrl, faviconUploadUrl] = await Promise.all([
			getSettings([
				"CONFERENCE_NAME",
				"BRANDING_LOGO_URL",
				"BRANDING_FAVICON_URL",
				"BRANDING_PRIMARY_COLOR",
				"BRANDING_SECONDARY_COLOR",
				"BRANDING_FOOTER_TEXT",
				"BRANDING_LOGO_DARK_INVERT",
				"DATE_FORMAT",
				"TIME_FORMAT",
			]),
			getBrandingLogoUrl(),
			getBrandingFaviconUrl(),
		]);
		return {
			conferenceName: settings.CONFERENCE_NAME,
			logoUrl: logoUploadUrl || settings.BRANDING_LOGO_URL,
			faviconUrl: faviconUploadUrl || settings.BRANDING_FAVICON_URL,
			logoUploadUrl: "",
			faviconUploadUrl: "",
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
		const [settings, authBackgroundUrl, logoUploadUrl, faviconUploadUrl] =
			await Promise.all([
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
				getBrandingLogoUrl(),
				getBrandingFaviconUrl(),
			]);
		return {
			logoUrl: settings.BRANDING_LOGO_URL,
			faviconUrl: settings.BRANDING_FAVICON_URL,
			logoUploadUrl,
			faviconUploadUrl,
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
	.middleware([adminOnlyMiddleware])
	.validator(brandingSchema)
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
	.middleware([adminOnlyMiddleware])
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data }) => {
		const buffer = await fileToBuffer(data.file);
		await uploadAuthBackground(buffer);
		const url = await getAuthBackgroundUrl();
		return { url };
	});

/**
 * Delete auth background image (admin only)
 */
export const deleteAuthBackgroundFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.handler(async () => {
		await deleteAuthBackground();
		return { success: true };
	});

/**
 * Upload branding logo (admin only)
 */
export const uploadBrandingLogoFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data }) => {
		await uploadBrandingLogo(await fileToBuffer(data.file));
		return { url: await getBrandingLogoUrl() };
	});

/**
 * Delete branding logo (admin only)
 */
export const deleteBrandingLogoFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.handler(async () => {
		await deleteBrandingLogo();
		return { success: true };
	});

/**
 * Upload branding favicon (admin only)
 */
export const uploadBrandingFaviconFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data }) => {
		await uploadBrandingFavicon(await fileToBuffer(data.file));
		return { url: await getBrandingFaviconUrl() };
	});

/**
 * Delete branding favicon (admin only)
 */
export const deleteBrandingFaviconFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.handler(async () => {
		await deleteBrandingFavicon();
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

/** OpenGraph metadata (public, no auth) */
export interface OgMetadata {
	title: string;
	description: string;
	imageUrl: string;
}

/**
 * Get OpenGraph metadata (public, no auth).
 * Used by root route head() for social sharing tags.
 */
export const getOgMetadataFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<OgMetadata> => {
		const s = await getSettings(["CONFERENCE_NAME", "CONFERENCE_SUBTITLE"]);
		const isConfigured =
			s.CONFERENCE_NAME &&
			s.CONFERENCE_NAME !== getDefaultSetting("CONFERENCE_NAME");
		return {
			title: isConfigured
				? s.CONFERENCE_NAME
				: "Suberus - Conference Management System",
			description:
				s.CONFERENCE_SUBTITLE ||
				"Abstract management system for scientific conferences.",
			imageUrl: `${env.APP_BASE_URL.replace(/\/$/, "")}/web-app-manifest-512x512.png`,
		};
	},
);

/**
 * Get auth page branding (public, no auth).
 * Used by _auth layout for SSR — login/register pages.
 */
export const getAuthPageBrandingFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthPageBranding> => {
		const [s, authBackgroundUrl, logoUploadUrl] = await Promise.all([
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
			getBrandingLogoUrl(),
		]);
		return {
			conferenceName: s.CONFERENCE_NAME,
			logoUrl: logoUploadUrl || s.BRANDING_LOGO_URL,
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
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ content: z.string().min(1) }))
	.handler(async ({ data }) => {
		await setSetting("FEE_PAYMENT_INSTRUCTIONS", data.content);
		return { success: true };
	});

/**
 * Update Terms of Service content (admin only)
 */
export const updateTosContentFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ content: z.string().min(1) }))
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
	.middleware([adminOnlyMiddleware])
	.validator(reminderSettingsSchema)
	.handler(async ({ data }) => {
		await setSetting("REMINDER_REVIEWER_SETTINGS", data.reviewer);
		await setSetting("REMINDER_REVISION_SETTINGS", data.revision);
		await setSetting("REMINDER_DEADLINE_SETTINGS", data.deadline);
		return { success: true };
	});

// Fee types & currency

export const feeEnabledQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "fee-enabled"],
		queryFn: () => getFeeEnabledFn(),
	});

/**
 * Get whether the fee feature is enabled (requires auth — gates the user Fee nav item)
 */
export const getFeeEnabledFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("FEE_ENABLED");
	});

export const financesEnabledQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "finances-enabled"],
		queryFn: () => getFinancesEnabledFn(),
	});

export const getFinancesEnabledFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("FINANCES_ENABLED");
	});

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
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ feeTypes: z.array(feeTypeItemSchema).min(1) }))
	.handler(async ({ data }) => {
		await setSetting("FEE_TYPES", data.feeTypes);
		return { success: true };
	});

export const financesVatRatesQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "finances-vat-rates"],
		queryFn: () => getFinancesVatRatesFn(),
	});

export const getFinancesVatRatesFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("FINANCES_VAT_RATES");
	});

const vatRateItemSchema = z.object({
	id: z.string().min(1),
	rate: z.number().min(0).max(100),
});

export const updateFinancesVatRatesFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ vatRates: z.array(vatRateItemSchema) }))
	.handler(async ({ data }) => {
		await setSetting("FINANCES_VAT_RATES", data.vatRates);
		return { success: true };
	});
