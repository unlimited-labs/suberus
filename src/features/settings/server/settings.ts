import { z } from "zod";
import {
	DEFAULT_EXHIBITOR_CONFIG,
	DEFAULT_FULL_PAPER_CONFIG,
	DEFAULT_ORAL_PRESENTATION_CONFIG,
	DEFAULT_POSTER_CONFIG,
	getDefaultSetting,
} from "@/features/settings/defaults";
import {
	SUPPORTED_FILE_EXTENSIONS,
	type SupportedFileExtension,
} from "@/features/settings/file-types";
import {
	type AppSettingsMap,
	SUBMISSION_TYPE_KEYS,
	type SubmissionTypeConfig,
	type SubmissionTypeKey,
} from "@/features/settings/types";
import { prisma } from "@/shared/server/db.server";

const legacyScoringCriteria = z.array(z.string()).min(1);

/**
 * Normalize legacy scoringCriteria format.
 * Old format: string[] → New format: { name: string; description: string }[]
 */
function normalizeScoringCriteria(
	config: SubmissionTypeConfig,
): SubmissionTypeConfig {
	const legacy = legacyScoringCriteria.safeParse(config.scoringCriteria);
	if (!legacy.success) return config;
	return {
		...config,
		scoringCriteria: legacy.data.map((s) => ({ name: s, description: "" })),
	};
}

/**
 * Drop file extensions no longer supported (e.g. legacy doc/txt/rtf stored
 * before they were removed). Self-heals on the next save.
 */
function normalizeAllowedExtensions(
	config: SubmissionTypeConfig,
): SubmissionTypeConfig {
	if (!Array.isArray(config.allowedExtensions)) return config;
	const supported = config.allowedExtensions.filter(
		(ext): ext is SupportedFileExtension =>
			(SUPPORTED_FILE_EXTENSIONS as readonly string[]).includes(ext),
	);
	// ponytail: single extension per type — collapse legacy multi-value configs
	// to the first element on read, so old ["pdf","docx"] data needs no migration.
	const single = supported.slice(0, 1);
	if (single.length === config.allowedExtensions.length) return config;
	return { ...config, allowedExtensions: single };
}

function normalizeSubmissionTypeConfig(
	config: SubmissionTypeConfig,
): SubmissionTypeConfig {
	return normalizeAllowedExtensions(normalizeScoringCriteria(config));
}

/**
 * Get a single setting value by key.
 * Returns default if not found in DB.
 */
export async function getSetting<K extends keyof AppSettingsMap>(
	key: K,
): Promise<AppSettingsMap[K]> {
	const setting = await prisma.appSetting.findUnique({
		where: { key },
	});

	if (!setting) {
		return getDefaultSetting(key);
	}

	const value = setting.value as AppSettingsMap[K];

	// Normalize legacy string[] scoringCriteria for submission type configs
	if (
		(SUBMISSION_TYPE_KEYS as readonly string[]).includes(key) &&
		z.object({}).safeParse(value).success
	) {
		return normalizeSubmissionTypeConfig(
			value as SubmissionTypeConfig,
		) as AppSettingsMap[K];
	}

	return value;
}

/**
 * Set a single setting value by key.
 * Creates or updates the setting.
 */
export async function setSetting<K extends keyof AppSettingsMap>(
	key: K,
	value: AppSettingsMap[K],
): Promise<void> {
	await prisma.appSetting.upsert({
		where: { key },
		update: { value: value as object },
		create: {
			key,
			value: value as object,
		},
	});
}

/**
 * Get multiple settings at once.
 * Returns defaults for any not found.
 */
export async function getSettings<K extends keyof AppSettingsMap>(
	keys: K[],
): Promise<Pick<AppSettingsMap, K>> {
	// Query settings individually to avoid Prisma enum validation issues with IN clause
	const settings = await Promise.all(
		keys.map((key) =>
			prisma.appSetting.findUnique({
				where: { key },
			}),
		),
	);

	const result = {} as Pick<AppSettingsMap, K>;

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const found = settings[i];
		result[key] = found
			? (found.value as AppSettingsMap[K])
			: getDefaultSetting(key);
	}

	return result;
}

/**
 * Get all submission type configs.
 */
export async function getSubmissionTypeConfigs(): Promise<{
	ORAL_PRESENTATION: SubmissionTypeConfig;
	POSTER: SubmissionTypeConfig;
	FULL_PAPER: SubmissionTypeConfig;
	EXHIBITOR: SubmissionTypeConfig;
}> {
	const keys: SubmissionTypeKey[] = [
		"SUBMISSION_TYPE_ORAL_PRESENTATION",
		"SUBMISSION_TYPE_POSTER",
		"SUBMISSION_TYPE_FULL_PAPER",
		"SUBMISSION_TYPE_EXHIBITOR",
	];

	const settings = await getSettings(keys);

	// Merge with defaults so newly-added fields always have a value
	// Normalize legacy string[] scoringCriteria to { name, description }[]
	return {
		ORAL_PRESENTATION: normalizeSubmissionTypeConfig({
			...DEFAULT_ORAL_PRESENTATION_CONFIG,
			...settings.SUBMISSION_TYPE_ORAL_PRESENTATION,
		}),
		POSTER: normalizeSubmissionTypeConfig({
			...DEFAULT_POSTER_CONFIG,
			...settings.SUBMISSION_TYPE_POSTER,
		}),
		FULL_PAPER: normalizeSubmissionTypeConfig({
			...DEFAULT_FULL_PAPER_CONFIG,
			...settings.SUBMISSION_TYPE_FULL_PAPER,
		}),
		EXHIBITOR: normalizeSubmissionTypeConfig({
			...DEFAULT_EXHIBITOR_CONFIG,
			...settings.SUBMISSION_TYPE_EXHIBITOR,
		}),
	};
}

/**
 * Get active submission types for form display.
 * Returns only isActive=true configs with their submission type mapping.
 */
export async function getActiveSubmissionTypes(): Promise<
	Array<{
		type: "ABSTRACT" | "POSTER" | "FULL_PAPER";
		label: string;
		config: SubmissionTypeConfig;
	}>
> {
	const configs = await getSubmissionTypeConfigs();

	const result: Array<{
		type: "ABSTRACT" | "POSTER" | "FULL_PAPER";
		label: string;
		config: SubmissionTypeConfig;
	}> = [];

	if (configs.ORAL_PRESENTATION.isActive) {
		result.push({
			type: "ABSTRACT",
			label: "Oral Presentation",
			config: configs.ORAL_PRESENTATION,
		});
	}

	if (configs.POSTER.isActive) {
		result.push({
			type: "POSTER",
			label: "Poster",
			config: configs.POSTER,
		});
	}

	if (configs.FULL_PAPER.isActive) {
		result.push({
			type: "FULL_PAPER",
			label: "Full Paper",
			config: configs.FULL_PAPER,
		});
	}

	return result;
}
