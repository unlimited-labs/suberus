import { prisma } from "@/db";
import type { AppSettingKey } from "@/generated/prisma/enums";
import { getDefaultSetting } from "@/lib/settings/defaults";
import type {
	AppSettingsMap,
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/lib/settings/types";

/**
 * Get a single setting value by key.
 * Returns default if not found in DB.
 */
export async function getSetting<K extends keyof AppSettingsMap>(
	key: K,
): Promise<AppSettingsMap[K]> {
	const setting = await prisma.appSetting.findUnique({
		where: { key: key as AppSettingKey },
	});

	if (!setting) {
		return getDefaultSetting(key);
	}

	return setting.value as AppSettingsMap[K];
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
		where: { key: key as AppSettingKey },
		update: { value: value as object },
		create: {
			key: key as AppSettingKey,
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
				where: { key: key as AppSettingKey },
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

	return {
		ORAL_PRESENTATION: settings.SUBMISSION_TYPE_ORAL_PRESENTATION,
		POSTER: settings.SUBMISSION_TYPE_POSTER,
		FULL_PAPER: settings.SUBMISSION_TYPE_FULL_PAPER,
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
