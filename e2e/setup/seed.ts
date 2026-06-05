// Standalone E2E seed, run as a child process per worker DB by global-setup.
// Separate process because `auth.server` binds its Prisma client to DATABASE_URL
// at import and Node caches the module, so one process can only seed one DB.
import { PrismaClient } from "../../src/generated/prisma/client";
import { UserRole } from "../../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { DEFAULT_EMAIL_TEMPLATES } from "../../prisma/default-email-templates";
import {
	TEST_USER,
	ADMIN_USER,
	REVIEWER_USER,
	EDITOR_USER,
	UNVERIFIED_USER,
	ADMIN_VERIFY_TEST_USER,
	RESET_PASSWORD_USER,
} from "../helpers/test-users";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

// DATABASE_URL/SMTP_FROM_EMAIL come from the parent process and must win over .env.
config({ quiet: true, path: resolve(PROJECT_ROOT, ".env") });

// Submission type configs with scoring and double-blind enabled for ORAL_PRESENTATION
const SUBMISSION_TYPE_CONFIGS = {
	ORAL_PRESENTATION: {
		isActive: true,
		contentFormat: "TEXT",
		allowedExtensions: [],
		requiredReviewers: 2,
		reviewMode: "DOUBLE_BLIND",
		reviewDeadlineDays: 14,
		requiresEditorDecision: true,
		enableScoring: true,
		scoringCriteria: [
			{ name: "Originality", description: "Contribution to the field" },
			{ name: "Clarity", description: "Writing quality and structure" },
			{ name: "Significance", description: "Importance and impact of the work" },
			{ name: "Methodology", description: "Research design and execution" },
		],
		enableConfidenceLevel: true,
		enableTrackSelection: false,
	},
	POSTER: {
		isActive: true,
		contentFormat: "TEXT",
		allowedExtensions: [],
		requiredReviewers: 1,
		reviewMode: "SINGLE_BLIND",
		reviewDeadlineDays: 7,
		requiresEditorDecision: false,
		enableScoring: false,
		scoringCriteria: [],
		enableConfidenceLevel: true,
		enableTrackSelection: false,
	},
	FULL_PAPER: {
		isActive: true,
		contentFormat: "FILE",
		allowedExtensions: ["pdf", "doc", "docx"],
		requiredReviewers: 3,
		reviewMode: "DOUBLE_BLIND",
		reviewDeadlineDays: 21,
		requiresEditorDecision: true,
		enableScoring: true,
		scoringCriteria: [
			{ name: "Originality", description: "Contribution to the field" },
			{ name: "Clarity", description: "Writing quality and structure" },
			{ name: "Significance", description: "Importance and impact of the work" },
			{ name: "Methodology", description: "Research design and execution" },
			{ name: "Technical Quality", description: "Technical soundness and rigor" },
		],
		enableConfidenceLevel: true,
		enableTrackSelection: false,
	},
};

async function seed() {
	const { auth } = await import("../../auth.server");

	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) throw new Error("DATABASE_URL not set for seed");
	const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

	type SeedUser = { email: string; password: string; firstName: string; lastName: string; affiliationName: string };
	async function seedUser(
		u: SeedUser,
		opts: { role?: UserRole; emailVerified?: boolean; needInvoice?: boolean } = {},
	) {
		const affiliation = await prisma.affiliation.upsert({
			where: { name: u.affiliationName },
			update: {},
			create: { name: u.affiliationName },
		});
		const res = await auth.api.signUpEmail({
			body: {
				email: u.email,
				password: u.password,
				name: u.lastName,
				firstName: u.firstName,
				affiliationId: affiliation.id,
			},
		});
		if (!res?.user) throw new Error(`Failed to create user: ${u.email}`);
		await prisma.user.update({
			where: { id: res.user.id },
			data: {
				isActive: true,
				emailVerified: opts.emailVerified ?? true,
				affiliationId: affiliation.id,
				...(opts.role ? { role: opts.role } : {}),
				...(opts.needInvoice ? { needInvoice: true } : {}),
			},
		});
		console.log(`✅ User created: ${u.email}`);
		return res.user;
	}

	try {
		// ============================================================
		// CREATE TEST USERS
		// ============================================================

		const testUser = await seedUser(TEST_USER, { emailVerified: true, needInvoice: true });
		await seedUser(ADMIN_USER, { role: UserRole.ADMIN });
		await seedUser(REVIEWER_USER, { role: UserRole.REVIEWER });
		await seedUser(EDITOR_USER, { role: UserRole.EDITOR });
		await seedUser(UNVERIFIED_USER, { emailVerified: false });
		await seedUser(ADMIN_VERIFY_TEST_USER, { emailVerified: false });
		await seedUser(RESET_PASSWORD_USER, { emailVerified: true });

		// ============================================================
		// SEED APP SETTINGS
		// ============================================================

		// Email templates
		for (const template of DEFAULT_EMAIL_TEMPLATES) {
			await prisma.emailTemplate.upsert({
				where: { eventType: template.eventType },
				update: { availablePlaceholders: template.availablePlaceholders },
				create: template,
			});
		}

		console.log("✅ Email templates seeded");

		// Submission type configs
		await prisma.appSetting.upsert({
			where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
			update: { value: SUBMISSION_TYPE_CONFIGS.ORAL_PRESENTATION },
			create: {
				key: "SUBMISSION_TYPE_ORAL_PRESENTATION",
				value: SUBMISSION_TYPE_CONFIGS.ORAL_PRESENTATION,
			},
		});

		await prisma.appSetting.upsert({
			where: { key: "SUBMISSION_TYPE_POSTER" },
			update: { value: SUBMISSION_TYPE_CONFIGS.POSTER },
			create: {
				key: "SUBMISSION_TYPE_POSTER",
				value: SUBMISSION_TYPE_CONFIGS.POSTER,
			},
		});

		await prisma.appSetting.upsert({
			where: { key: "SUBMISSION_TYPE_FULL_PAPER" },
			update: { value: SUBMISSION_TYPE_CONFIGS.FULL_PAPER },
			create: {
				key: "SUBMISSION_TYPE_FULL_PAPER",
				value: SUBMISSION_TYPE_CONFIGS.FULL_PAPER,
			},
		});

		console.log("✅ Submission type configs seeded");

		// Validation settings
		const validationSettings = [
			{ key: "MIN_TITLE_LENGTH", value: 10 },
			{ key: "MAX_TITLE_LENGTH", value: 200 },
			{ key: "MIN_ABSTRACT_LENGTH", value: 500 },
			{ key: "MAX_ABSTRACT_LENGTH", value: 2000 },
			{ key: "MIN_KEYWORDS", value: 3 },
			{ key: "MAX_KEYWORDS", value: 5 },
			{ key: "MAX_FILE_SIZE_MB", value: 10 },
			{ key: "MAX_AUTHORS", value: 10 },
			{ key: "ENABLE_KEYWORDS", value: true },
			{ key: "ALLOWED_FILE_TYPES", value: ["pdf", "docx", "doc"] },
		];

		for (const setting of validationSettings) {
			await prisma.appSetting.upsert({
				where: { key: setting.key as any },
				update: { value: setting.value },
				create: { key: setting.key as any, value: setting.value },
			});
		}

		console.log("✅ Validation settings seeded");

		// Survey questions
		await prisma.surveyQuestion.create({
			data: {
				label: "Please send me an Invitation Letter for a Visa Application.",
				orderIndex: 0,
				isActive: true,
			},
		});

		await prisma.surveyQuestion.create({
			data: {
				label: "I need a certificate of attendance.",
				orderIndex: 1,
				isActive: true,
			},
		});

		await prisma.surveyQuestion.create({
			data: {
				label: "Dietary requirements",
				type: "TEXT",
				orderIndex: 2,
				isActive: true,
				isRequired: false,
			},
		});

		const preferredFormatQuestion = await prisma.surveyQuestion.create({
			data: {
				label: "Preferred session format",
				type: "SINGLE_SELECT",
				orderIndex: 3,
				isActive: true,
				isRequired: true,
				options: ["Oral", "Poster", "Workshop"],
			},
		});

		// Pre-answer the required question for the main test user so the profile
		// survey section (which now enforces isRequired) is satisfied on load and
		// existing save tests are not blocked.
		await prisma.surveyAnswer.create({
			data: {
				userId: testUser.id,
				questionId: preferredFormatQuestion.id,
				value: "Poster",
			},
		});

		await prisma.surveyQuestion.create({
			data: {
				label: "Which days will you attend?",
				type: "MULTI_SELECT",
				orderIndex: 4,
				isActive: true,
				isRequired: false,
				options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
			},
		});

		console.log("✅ Survey questions seeded");

		// Terms of Service content
		const tosKey = "TOS_CONTENT";
		const tosValue = "# Terms of Service\n\nBy using this system, you agree to the following terms and conditions.\n\n## Usage\n\nThis system is provided for academic conference management purposes only."
		await prisma.appSetting.upsert({
			where: { key: tosKey },
			update: { value: tosValue},
			create: {
				key:tosKey,
				value: tosValue,
			},
		});

		console.log("✅ ToS content seeded");

		// Fee types and currency
		await prisma.appSetting.upsert({
			where: { key: "FEE_TYPES" },
			update: {
				value: [
					{ id: "full", name: "Full Conference Fee", amount: 250 },
					{ id: "student", name: "Student Fee", amount: 100 },
				],
			},
			create: {
				key: "FEE_TYPES",
				value: [
					{ id: "full", name: "Full Conference Fee", amount: 250 },
					{ id: "student", name: "Student Fee", amount: 100 },
				],
			},
		});

		await prisma.appSetting.upsert({
			where: { key: "FEE_CURRENCY" },
			update: { value: "EUR" },
			create: { key: "FEE_CURRENCY", value: "EUR" },
		});

		console.log("✅ Fee types and currency seeded");

		// Contact email for admin notifications
		await prisma.appSetting.upsert({
			where: { key: "CONTACT_EMAIL" },
			update: { value: "contact@e2e.local" },
			create: { key: "CONTACT_EMAIL", value: "contact@e2e.local" },
		});

		console.log("✅ Contact email seeded");
	} finally {
		await prisma.$disconnect();
	}
}

seed()
	.then(() => {
		console.log(`✅ Seed complete for ${process.env.DATABASE_URL}`);
		process.exit(0);
	})
	.catch((error) => {
		console.error("❌ Seed failed:", error);
		process.exit(1);
	});
