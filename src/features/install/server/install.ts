import { auth } from "@/features/auth/server/auth.server";
import type { InstallFormData } from "@/features/install/validations";
import { APP_SETTINGS_DEFAULTS } from "@/features/settings/defaults";
import type { AppSettingsMap } from "@/features/settings/types";
import type { InputJsonValue } from "@/generated/prisma/internal/prismaNamespace.ts";
import { prisma } from "@/shared/server/db.server";
import { DEFAULT_EMAIL_TEMPLATES } from "../../../../prisma/default-email-templates";

function defaultSettingValue(key: keyof AppSettingsMap): InputJsonValue {
	// SAFETY: every AppSettingsMap value is a JSON literal by construction.
	return APP_SETTINGS_DEFAULTS[key] as InputJsonValue;
}

let cachedInstalled = false;

export async function isSystemInstalled(): Promise<boolean> {
	if (cachedInstalled) return true;
	const count = await prisma.user.count({ take: 1 });
	if (count > 0) {
		cachedInstalled = true;
	}
	return cachedInstalled;
}

export async function performInstall(data: InstallFormData): Promise<void> {
	if (await isSystemInstalled()) {
		throw new Response("System is already installed", { status: 409 });
	}

	const affiliation = await prisma.affiliation.upsert({
		where: { name: data.affiliation },
		update: {},
		create: { name: data.affiliation },
	});

	const result = await auth.api.signUpEmail({
		body: {
			email: data.email,
			password: data.password,
			name: data.lastName,
			firstName: data.firstName,
			affiliationId: affiliation.id,
		},
	});

	if (!result?.user) {
		throw new Response("Failed to create admin user", { status: 500 });
	}

	await prisma.user.update({
		where: { id: result.user.id },
		data: {
			role: "ADMIN",
			emailVerified: true,
			isActive: true,
			affiliationId: affiliation.id,
		},
	});

	await prisma.appSetting.upsert({
		where: { key: "CONFERENCE_NAME" },
		update: { value: data.conferenceName },
		create: { key: "CONFERENCE_NAME", value: data.conferenceName },
	});
	await prisma.appSetting.upsert({
		where: { key: "CONFERENCE_TIMEZONE" },
		update: { value: data.timezone },
		create: { key: "CONFERENCE_TIMEZONE", value: data.timezone },
	});

	for (const template of DEFAULT_EMAIL_TEMPLATES) {
		await prisma.emailTemplate.upsert({
			where: { eventType: template.eventType },
			update: { availablePlaceholders: template.availablePlaceholders },
			create: template,
		});
	}

	const submissionTypeKeys = [
		"SUBMISSION_TYPE_ORAL_PRESENTATION",
		"SUBMISSION_TYPE_POSTER",
		"SUBMISSION_TYPE_FULL_PAPER",
		"SUBMISSION_TYPE_EXHIBITOR",
	] as const;

	for (const key of submissionTypeKeys) {
		const value = defaultSettingValue(key);
		await prisma.appSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}

	const validationKeys = [
		"MIN_TITLE_LENGTH",
		"MAX_TITLE_LENGTH",
		"MIN_ABSTRACT_LENGTH",
		"MAX_ABSTRACT_LENGTH",
		"MIN_KEYWORDS",
		"MAX_KEYWORDS",
		"MAX_AUTHORS",
		"ENABLE_KEYWORDS",
	] as const;

	for (const key of validationKeys) {
		const value = defaultSettingValue(key);
		await prisma.appSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}

	const reminderKeys = [
		"REMINDER_REVIEWER_SETTINGS",
		"REMINDER_REVISION_SETTINGS",
		"REMINDER_DEADLINE_SETTINGS",
	] as const;

	for (const key of reminderKeys) {
		const value = defaultSettingValue(key);
		await prisma.appSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}

	await prisma.appSetting.upsert({
		where: { key: "INVITATION_VALIDITY_HOURS" },
		update: {},
		create: {
			key: "INVITATION_VALIDITY_HOURS",
			value: defaultSettingValue("INVITATION_VALIDITY_HOURS"),
		},
	});

	cachedInstalled = true;
}
