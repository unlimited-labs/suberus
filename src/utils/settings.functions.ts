import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
	AppSettingsMap,
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
	allowRevisions: z.boolean(),
	maxRevisions: z.number().int().min(0).max(10),
	enableScoring: z.boolean(),
	scoringCriteria: z.array(z.string()),
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
				{
					status: 400,
				},
			);
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

/** Submission validation settings shape */
export interface SubmissionValidationSettings {
	minTitleLength: number;
	maxTitleLength: number;
	minAbstractLength: number;
	maxAbstractLength: number;
	minKeywords: number;
	maxKeywords: number;
	maxFileSize: number;
	maxAuthors: number;
	requireOrcid: boolean;
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
			"MAX_AUTHORS",
			"REQUIRE_ORCID",
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
			maxAuthors: settings.MAX_AUTHORS,
			requireOrcid: settings.REQUIRE_ORCID,
			enableKeywords: settings.ENABLE_KEYWORDS,
			allowedFileTypes: settings.ALLOWED_FILE_TYPES,
		};
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
			maxAuthors: z.number().int().min(1).max(50),
			requireOrcid: z.boolean(),
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
		await setSetting("MAX_AUTHORS", data.maxAuthors);
		await setSetting("REQUIRE_ORCID", data.requireOrcid);
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
