import { prisma } from "@/db.server";
import {
	DEFAULT_FULL_PAPER_CONFIG,
	DEFAULT_ORAL_PRESENTATION_CONFIG,
	DEFAULT_POSTER_CONFIG,
	getDefaultSetting,
} from "@/lib/settings/defaults";
import {
	SUPPORTED_FILE_EXTENSIONS,
	type SupportedFileExtension,
} from "@/lib/settings/file-types";
import {
	type AppSettingsMap,
	SUBMISSION_TYPE_KEYS,
	type SubmissionTypeConfig,
	type SubmissionTypeKey,
} from "@/lib/settings/types";

/**
 * Normalize legacy scoringCriteria format.
 * Old format: string[] → New format: { name: string; description: string }[]
 */
function normalizeScoringCriteria(
	config: SubmissionTypeConfig,
): SubmissionTypeConfig {
	if (
		Array.isArray(config.scoringCriteria) &&
		config.scoringCriteria.length > 0 &&
		typeof config.scoringCriteria[0] === "string"
	) {
		return {
			...config,
			scoringCriteria: (config.scoringCriteria as unknown as string[]).map(
				(s) => ({ name: s, description: "" }),
			),
		};
	}
	return config;
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
	if (supported.length === config.allowedExtensions.length) return config;
	return { ...config, allowedExtensions: supported };
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
		value &&
		typeof value === "object"
	) {
		return normalizeSubmissionTypeConfig(
			value as unknown as SubmissionTypeConfig,
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
}> {
	const keys: SubmissionTypeKey[] = [
		"SUBMISSION_TYPE_ORAL_PRESENTATION",
		"SUBMISSION_TYPE_POSTER",
		"SUBMISSION_TYPE_FULL_PAPER",
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
