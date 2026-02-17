import { PrismaClient, Prisma } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "./auth.server";
import { config } from "dotenv";
import { resolve } from "path";
import { execSync } from "child_process";
import * as p from "@clack/prompts";
import { DEFAULT_EMAIL_TEMPLATES } from "./prisma/default-email-templates";
import { APP_SETTINGS_DEFAULTS } from "./src/lib/settings/defaults";

config({ path: resolve(process.cwd(), ".env.local") });

function handleCancel(value: unknown): asserts value is string {
	if (p.isCancel(value)) {
		p.cancel("Setup cancelled.");
		process.exit(0);
	}
}

async function init() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL not found. Make sure .env.local exists.");
	}

	const adapter = new PrismaPg({ connectionString });
	const prisma = new PrismaClient({ adapter });

	try {
		p.intro("Suberus Setup");

		// ============================================================
		// 0. DATABASE MIGRATIONS
		// ============================================================

		const migrateSpinner = p.spinner();
		migrateSpinner.start("Running database migrations...");
		execSync("pnpm db:update", { stdio: "pipe" });
		migrateSpinner.stop("Database schema up to date");

		// ============================================================
		// 1. ADMIN USER
		// ============================================================

		const checkSpinner = p.spinner();
		checkSpinner.start("Checking for existing admin...");
		const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

		if (existingAdmin) {
			checkSpinner.stop(`Admin already exists (${existingAdmin.email}), skipping.`);
		} else {
			checkSpinner.stop("No admin found. Let's create one.");

			const adminInfo = await p.group(
				{
					email: () =>
						p.text({
							message: "Admin email",
							placeholder: "admin@example.com",
							validate: (v) => {
								if (!v?.includes("@")) return "Must be a valid email address.";
								return undefined;
							},
						}),
					password: () =>
						p.password({
							message: "Admin password (min 10 chars)",
							validate: (v) => {
								if (!v || v.length < 10) return "Password must be at least 10 characters.";
								return undefined;
							},
						}),
					firstName: () =>
						p.text({
							message: "First name",
							validate: (v) => {
								if (!v?.trim()) return "First name is required.";
								return undefined;
							},
						}),
					lastName: () =>
						p.text({
							message: "Last name",
							validate: (v) => {
								if (!v?.trim()) return "Last name is required.";
								return undefined;
							},
						}),
					affiliation: () =>
						p.text({
							message: "Affiliation",
							validate: (v) => {
								if (!v?.trim()) return "Affiliation is required.";
								return undefined;
							},
						}),
				},
				{
					onCancel: () => {
						p.cancel("Setup cancelled.");
						process.exit(0);
					},
				},
			);

			const s = p.spinner();
			s.start("Creating admin...");

			const affiliation = await prisma.affiliation.upsert({
				where: { name: adminInfo.affiliation },
				update: {},
				create: { name: adminInfo.affiliation },
			});

			const result = await auth.api.signUpEmail({
				body: {
					email: adminInfo.email,
					password: adminInfo.password,
					name: adminInfo.lastName,
					firstName: adminInfo.firstName,
					affiliationId: affiliation.id,
				},
			});

			if (!result?.user) {
				s.error("Failed to create admin user.");
				throw new Error("Failed to create admin user.");
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

			s.stop(`Admin created: ${adminInfo.email}`);
		}

		// ============================================================
		// 2. CONFERENCE NAME
		// ============================================================

		const nameResult = await p.text({
			message: "Conference name",
			validate: (v) => {
				if (!v?.trim()) return "Conference name is required.";
				return undefined;
			},
		});
		handleCancel(nameResult);

		await prisma.appSetting.upsert({
			where: { key: "CONFERENCE_NAME" },
			update: { value: nameResult },
			create: { key: "CONFERENCE_NAME", value: nameResult },
		});

		p.log.success(`Conference name set: ${nameResult}`);

		// ============================================================
		// 3. SEED DATA (email templates, settings, etc.)
		// ============================================================

		const s = p.spinner();

		// Email templates
		s.start("Seeding email templates...");
		for (const template of DEFAULT_EMAIL_TEMPLATES) {
			await prisma.emailTemplate.upsert({
				where: { eventType: template.eventType },
				update: { availablePlaceholders: template.availablePlaceholders },
				create: template,
			});
		}
		s.stop("Email templates seeded");

		// Submission type configs
		s.start("Seeding submission type configs...");
		const submissionTypeKeys = [
			"SUBMISSION_TYPE_ORAL_PRESENTATION",
			"SUBMISSION_TYPE_POSTER",
			"SUBMISSION_TYPE_FULL_PAPER",
		] as const;

		for (const key of submissionTypeKeys) {
			const value = APP_SETTINGS_DEFAULTS[key] as unknown as Prisma.InputJsonValue;
			await prisma.appSetting.upsert({
				where: { key },
				update: { value },
				create: { key, value },
			});
		}
		s.stop("Submission type configs seeded");

		// Validation settings
		s.start("Seeding validation settings...");
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
				update: { value: APP_SETTINGS_DEFAULTS[key] },
				create: { key, value: APP_SETTINGS_DEFAULTS[key] },
			});
		}
		s.stop("Validation settings seeded");

		// Reminder settings
		s.start("Seeding reminder settings...");
		const reminderKeys = [
			"REMINDER_REVIEWER_SETTINGS",
			"REMINDER_REVISION_SETTINGS",
			"REMINDER_DEADLINE_SETTINGS",
		] as const;

		for (const key of reminderKeys) {
			const value = APP_SETTINGS_DEFAULTS[key] as unknown as Prisma.InputJsonValue;
			await prisma.appSetting.upsert({
				where: { key },
				update: { value },
				create: { key, value },
			});
		}
		s.stop("Reminder settings seeded");

		// Invitation settings
		s.start("Seeding invitation settings...");
		await prisma.appSetting.upsert({
			where: { key: "INVITATION_VALIDITY_HOURS" },
			update: {},
			create: { key: "INVITATION_VALIDITY_HOURS", value: APP_SETTINGS_DEFAULTS.INVITATION_VALIDITY_HOURS },
		});
		s.stop("Invitation settings seeded");

		p.outro("Setup complete!");
	} catch (error) {
		p.log.error(`Seed failed: ${error instanceof Error ? error.message : error}`);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

init();
