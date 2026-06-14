import { auth } from "@/features/auth/server/auth.server";
import { APP_SETTINGS_DEFAULTS } from "@/lib/settings/defaults";
import type { InstallFormData } from "@/lib/validations/install";
import { prisma } from "@/shared/server/db.server";
import { DEFAULT_EMAIL_TEMPLATES } from "../../../prisma/default-email-templates";

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

	// 1. Upsert affiliation
	const affiliation = await prisma.affiliation.upsert({
		where: { name: data.affiliation },
		update: {},
		create: { name: data.affiliation },
	});

	// 2. Create admin user via Better Auth
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

	// 3. Promote to admin, verify email, activate
	await prisma.user.update({
		where: { id: result.user.id },
		data: {
			role: "ADMIN",
			emailVerified: true,
			isActive: true,
			affiliationId: affiliation.id,
		},
	});

	// 4. Conference name + timezone (seeded from the browser at install)
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

	// 5. Email templates
	for (const template of DEFAULT_EMAIL_TEMPLATES) {
		await prisma.emailTemplate.upsert({
			where: { eventType: template.eventType },
			update: { availablePlaceholders: template.availablePlaceholders },
			create: template,
		});
	}

	// 6. Submission type configs
	const submissionTypeKeys = [
		"SUBMISSION_TYPE_ORAL_PRESENTATION",
		"SUBMISSION_TYPE_POSTER",
		"SUBMISSION_TYPE_FULL_PAPER",
		"SUBMISSION_TYPE_EXHIBITOR",
	] as const;

	for (const key of submissionTypeKeys) {
		const value = APP_SETTINGS_DEFAULTS[key] as unknown as object;
		await prisma.appSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}

	// 7. Validation settings
	const validationKeys = [
		"MIN_TITLE_LENGTH",
		"MAX_TITLE_LENGTH",
		"MIN_ABSTRACT_LENGTH",
		"MAX_ABSTRACT_LENGTH",
		"MIN_KEYWORDS",
		"MAX_KEYWORDS",
		"MAX_FILE_SIZE_MB",
		"MAX_AUTHORS",
		"ENABLE_KEYWORDS",
		"ALLOWED_FILE_TYPES",
	] as const;

	for (const key of validationKeys) {
		await prisma.appSetting.upsert({
			where: { key },
			update: { value: APP_SETTINGS_DEFAULTS[key] as object },
			create: { key, value: APP_SETTINGS_DEFAULTS[key] as object },
		});
	}

	// 8. Reminder settings
	const reminderKeys = [
		"REMINDER_REVIEWER_SETTINGS",
		"REMINDER_REVISION_SETTINGS",
		"REMINDER_DEADLINE_SETTINGS",
	] as const;

	for (const key of reminderKeys) {
		const value = APP_SETTINGS_DEFAULTS[key] as unknown as object;
		await prisma.appSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}

	// 9. Invitation settings
	await prisma.appSetting.upsert({
		where: { key: "INVITATION_VALIDITY_HOURS" },
		update: {},
		create: {
			key: "INVITATION_VALIDITY_HOURS",
			value:
				APP_SETTINGS_DEFAULTS.INVITATION_VALIDITY_HOURS as unknown as object,
		},
	});

	cachedInstalled = true;
}
