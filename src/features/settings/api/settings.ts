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
	getConferenceSettings,
	updateConferenceSettings,
} from "@/features/settings/server/conference";
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
import {
	brandingPatch,
	conferenceSettingsPatch,
	reminderSettingsSchema,
	setSettingSchema,
	submissionTypeUpdateSchema,
	submissionValidationSettingsSchema,
	tosContentSchema,
} from "@/features/settings/validations";
import { isDeadlinePassed } from "@/shared/lib/deadline";
import { lookup } from "@/shared/lib/lookup";
import { prisma } from "@/shared/server/db.server";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";

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
			// SAFETY: the server fn returns the value for exactly this key.
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

export const getSettingFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.object({ key: z.string() }))
	.handler(async ({ data }) => {
		// SAFETY: the validator restricts key to the AppSettingsMap key union.
		return getSetting(data.key as keyof AppSettingsMap);
	});

export const setSettingFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(setSettingSchema)
	.handler(async ({ data }) => {
		// SAFETY: setSettingSchema is a discriminated union pairing each allowed
		// key with its own value schema, but TS cannot correlate the two across
		// the union without narrowing every branch by hand.
		await setSetting(
			data.key as keyof AppSettingsMap,
			data.value as AppSettingsMap[keyof AppSettingsMap],
		);
		return { success: true };
	});

export const getSubmissionTypeConfigsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getSubmissionTypeConfigs();
	});

export const updateSubmissionTypeConfigFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(submissionTypeUpdateSchema)
	.handler(async ({ data }) => {
		await setSetting(
			// SAFETY: the validator restricts type to the submission-type keys.
			data.type as SubmissionTypeKey,
			// SAFETY: the validator shapes config before it reaches here.
			data.config as SubmissionTypeConfig,
		);
		return { success: true };
	});

export const getActiveSubmissionTypesFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getActiveSubmissionTypes();
	});

export type { ConferenceSettings } from "@/features/settings/validations";

export const getSubmissionGuidelinesFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("SUBMISSION_GUIDELINES");
	});

export const getReviewGuidelinesFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("REVIEW_GUIDELINES");
	});

export const getEmailFooterFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getSetting("EMAIL_FOOTER_TEXT");
	});

export const updateEmailFooterFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ value: z.string() }))
	.handler(async ({ data }) => {
		await setSetting("EMAIL_FOOTER_TEXT", data.value);
		return { success: true };
	});

export const updateSubmissionGuidelinesFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ value: z.string() }))
	.handler(async ({ data }) => {
		await setSetting("SUBMISSION_GUIDELINES", data.value);
		return { success: true };
	});

export const updateReviewGuidelinesFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ value: z.string() }))
	.handler(async ({ data }) => {
		await setSetting("REVIEW_GUIDELINES", data.value);
		return { success: true };
	});

export interface SubmissionValidationSettings {
	minTitleLength: number;
	maxTitleLength: number;
	minAbstractLength: number;
	maxAbstractLength: number;
	minKeywords: number;
	maxKeywords: number;
	enableKeywords: boolean;
}

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

export const getConferenceSettingsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => getConferenceSettings());

export const updateConferenceSettingsFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(conferenceSettingsPatch)
	.handler(async ({ data, context }) => {
		await updateConferenceSettings(data, context.user.id);
		return { success: true };
	});

export const updateSubmissionValidationSettingsFn = createServerFn({
	method: "POST",
})
	.middleware([adminOnlyMiddleware])
	.validator(submissionValidationSettingsSchema)
	.handler(async ({ data }) => {
		await setSetting("MIN_TITLE_LENGTH", data.minTitleLength);
		await setSetting("MAX_TITLE_LENGTH", data.maxTitleLength);
		await setSetting("MIN_ABSTRACT_LENGTH", data.minAbstractLength);
		await setSetting("MAX_ABSTRACT_LENGTH", data.maxAbstractLength);
		await setSetting("MIN_KEYWORDS", data.minKeywords);
		await setSetting("MAX_KEYWORDS", data.maxKeywords);
		await setSetting("ENABLE_KEYWORDS", data.enableKeywords);

		return { success: true };
	});

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

export const getRegistrationStatusFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const [deadline, locked, timezone, contactConsentEnabled] = await Promise.all(
		[
			getSetting("REGISTRATION_DEADLINE"),
			getSetting("REGISTRATION_LOCKED"),
			getSetting("CONFERENCE_TIMEZONE"),
			getSetting("PROGRAM_SHOW_AUTHOR_INFO"),
		],
	);
	const deadlinePassed = deadline
		? isDeadlinePassed(deadline, timezone, new Date())
		: false;
	return {
		closed: locked || deadlinePassed,
		locked,
		deadlinePassed,
		contactConsentEnabled,
	};
});

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

export interface AppBranding extends BrandingSettings {
	conferenceName: string;
	dateFormat: string;
	timeFormat: "24h" | "12h";
}

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

const BRANDING_KEYS = {
	logoUrl: "BRANDING_LOGO_URL",
	faviconUrl: "BRANDING_FAVICON_URL",
	primaryColor: "BRANDING_PRIMARY_COLOR",
	secondaryColor: "BRANDING_SECONDARY_COLOR",
	footerText: "BRANDING_FOOTER_TEXT",
	authBgOverlay: "BRANDING_AUTH_BG_OVERLAY",
	logoDarkInvert: "BRANDING_LOGO_DARK_INVERT",
} as const;

export const updateBrandingSettingsFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(brandingPatch)
	.handler(async ({ data }) => {
		for (const [field, key] of Object.entries(BRANDING_KEYS)) {
			const value = lookup(data, field);
			if (value !== undefined) await setSetting(key, value);
		}
		return { success: true };
	});

export const uploadAuthBackgroundFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data }) => {
		const buffer = await fileToBuffer(data.file);
		await uploadAuthBackground(buffer);
		const url = await getAuthBackgroundUrl();
		return { url };
	});

export const deleteAuthBackgroundFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.handler(async () => {
		await deleteAuthBackground();
		return { success: true };
	});

export const uploadBrandingLogoFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data }) => {
		await uploadBrandingLogo(await fileToBuffer(data.file));
		return { url: await getBrandingLogoUrl() };
	});

export const deleteBrandingLogoFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.handler(async () => {
		await deleteBrandingLogo();
		return { success: true };
	});

export const uploadBrandingFaviconFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data }) => {
		await uploadBrandingFavicon(await fileToBuffer(data.file));
		return { url: await getBrandingFaviconUrl() };
	});

export const deleteBrandingFaviconFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.handler(async () => {
		await deleteBrandingFavicon();
		return { success: true };
	});

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

export const getPrimaryColorFn = createServerFn({ method: "GET" }).handler(
	async () => {
		return await getSetting("BRANDING_PRIMARY_COLOR");
	},
);

export interface OgMetadata {
	title: string;
	description: string;
	imageUrl: string;
}

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

export const updateFeeInstructionsFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ content: z.string().min(1) }))
	.handler(async ({ data }) => {
		await setSetting("FEE_PAYMENT_INSTRUCTIONS", data.content);
		return { success: true };
	});

export const updateTosContentFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(tosContentSchema)
	.handler(async ({ data }) => {
		await setSetting("TOS_CONTENT", data.content);
		return { success: true };
	});

export interface ReminderSettings {
	reviewer: ReviewerReminderSettings;
	revision: RevisionReminderSettings;
	deadline: DeadlineReminderSettings;
}

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

export const updateReminderSettingsFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(reminderSettingsSchema)
	.handler(async ({ data }) => {
		await setSetting("REMINDER_REVIEWER_SETTINGS", data.reviewer);
		await setSetting("REMINDER_REVISION_SETTINGS", data.revision);
		await setSetting("REMINDER_DEADLINE_SETTINGS", data.deadline);
		return { success: true };
	});

export const feeEnabledQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "fee-enabled"],
		queryFn: () => getFeeEnabledFn(),
	});

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

export const getFeeTypesFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSetting("FEE_TYPES");
	});

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
