import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { auth } from "../../auth.server";
import { config } from "dotenv";
import { execSync } from "child_process";
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
import { mailpit } from "../helpers/mailpit";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

// Load .env.local
config({ quiet: true, path: resolve(PROJECT_ROOT, ".env.local") });

// Submission type configs with scoring and double-blind enabled for ORAL_PRESENTATION
const SUBMISSION_TYPE_CONFIGS = {
	ORAL_PRESENTATION: {
		isActive: true,
		contentFormat: "TEXT",
		allowedExtensions: [],
		minReviewers: 2,
		maxReviewers: 3,
		reviewMode: "DOUBLE_BLIND",
		reviewDeadlineDays: 14,
		requiresEditorDecision: true,
		autoTransitionAfterReviews: false,
		allowRevisions: true,
		enableScoring: true,
		scoringCriteria: [
			{ name: "Originality", description: "Contribution to the field" },
			{ name: "Clarity", description: "Writing quality and structure" },
			{ name: "Significance", description: "Importance and impact of the work" },
			{ name: "Methodology", description: "Research design and execution" },
		],
		enableConfidenceLevel: true,
		enableSessionSelection: false,
	},
	POSTER: {
		isActive: true,
		contentFormat: "TEXT",
		allowedExtensions: [],
		minReviewers: 1,
		maxReviewers: 2,
		reviewMode: "SINGLE_BLIND",
		reviewDeadlineDays: 7,
		requiresEditorDecision: false,
		autoTransitionAfterReviews: true,
		allowRevisions: false,
		enableScoring: false,
		scoringCriteria: [],
		enableConfidenceLevel: true,
		enableSessionSelection: false,
	},
	FULL_PAPER: {
		isActive: true,
		contentFormat: "FILE",
		allowedExtensions: ["pdf", "doc", "docx"],
		minReviewers: 3,
		maxReviewers: 4,
		reviewMode: "DOUBLE_BLIND",
		reviewDeadlineDays: 21,
		requiresEditorDecision: true,
		autoTransitionAfterReviews: false,
		allowRevisions: true,
		enableScoring: true,
		scoringCriteria: [
			{ name: "Originality", description: "Contribution to the field" },
			{ name: "Clarity", description: "Writing quality and structure" },
			{ name: "Significance", description: "Importance and impact of the work" },
			{ name: "Methodology", description: "Research design and execution" },
			{ name: "Technical Quality", description: "Technical soundness and rigor" },
		],
		enableConfidenceLevel: true,
		enableSessionSelection: false,
	},
};

async function globalSetup() {
	// ============================================================
	// RESET DATABASE & MAILPIT
	// ============================================================

	// Wipe database and recreate schema from prisma/schema.prisma
	console.log("🔄 Resetting database...");
	execSync("pnpm exec prisma db push --force-reset", {
		cwd: PROJECT_ROOT,
		stdio: "pipe",
		env: { ...process.env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes" },
	});
	console.log("✅ Database reset");

	// Clear all Mailpit messages
	console.log("🔄 Clearing Mailpit...");
	await mailpit.deleteMessages();
	console.log("✅ Mailpit cleared");

	// Clear Garage S3 bucket
	if (process.env.GARAGE_ENDPOINT && process.env.GARAGE_BUCKET) {
		console.log("🔄 Clearing Garage S3 bucket...");
		const s3 = new S3Client({
			endpoint: process.env.GARAGE_ENDPOINT,
			region: "garage",
			credentials: {
				accessKeyId: process.env.GARAGE_ACCESS_KEY_ID as string,
				secretAccessKey: process.env.GARAGE_SECRET_ACCESS_KEY as string,
			},
			forcePathStyle: true,
		});
		const bucket = process.env.GARAGE_BUCKET;

		let continuationToken: string | undefined;
		do {
			const list = await s3.send(
				new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
			);
			if (list.Contents?.length) {
				await s3.send(
					new DeleteObjectsCommand({
						Bucket: bucket,
						Delete: { Objects: list.Contents.map((obj) => ({ Key: obj.Key })) },
					}),
				);
			}
			continuationToken = list.NextContinuationToken;
		} while (continuationToken);

		s3.destroy();
		console.log("✅ Garage S3 bucket cleared");
	} else {
		console.log("⏭️ Garage S3 not configured, skipping");
	}

	// ============================================================
	// SEED DATA
	// ============================================================

	const connectionString = process.env.DATABASE_URL;
	const adapter = new PrismaPg({ connectionString });
	const prisma = new PrismaClient({ adapter });

	try {
		// ============================================================
		// CREATE TEST USERS
		// ============================================================

		// Create affiliations
		const testAffiliation = await prisma.affiliation.upsert({
			where: { name: TEST_USER.affiliationName },
			update: {},
			create: { name: TEST_USER.affiliationName },
		});

		const adminAffiliation = await prisma.affiliation.upsert({
			where: { name: ADMIN_USER.affiliationName },
			update: {},
			create: { name: ADMIN_USER.affiliationName },
		});

		const reviewerAffiliation = await prisma.affiliation.upsert({
			where: { name: REVIEWER_USER.affiliationName },
			update: {},
			create: { name: REVIEWER_USER.affiliationName },
		});

		const editorAffiliation = await prisma.affiliation.upsert({
			where: { name: EDITOR_USER.affiliationName },
			update: {},
			create: { name: EDITOR_USER.affiliationName },
		});

		const unverifiedAffiliation = await prisma.affiliation.upsert({
			where: { name: UNVERIFIED_USER.affiliationName },
			update: {},
			create: { name: UNVERIFIED_USER.affiliationName },
		});

		const adminVerifyTestAffiliation = await prisma.affiliation.upsert({
			where: { name: ADMIN_VERIFY_TEST_USER.affiliationName },
			update: {},
			create: { name: ADMIN_VERIFY_TEST_USER.affiliationName },
		});

		const resetPasswordAffiliation = await prisma.affiliation.upsert({
			where: { name: RESET_PASSWORD_USER.affiliationName },
			update: {},
			create: { name: RESET_PASSWORD_USER.affiliationName },
		});

		// Create test user
		const testResult = await auth.api.signUpEmail({
			body: {
				email: TEST_USER.email,
				password: TEST_USER.password,
				name: TEST_USER.lastName,
				firstName: TEST_USER.firstName,
				affiliationId: testAffiliation.id,
			},
		});

		if (!testResult?.user) {
			throw new Error("Failed to create test user");
		}

		await prisma.user.update({
			where: { id: testResult.user.id },
			data: { emailVerified: true, isActive: true, affiliationId: testAffiliation.id },
		});

		console.log(`✅ Test user created: ${TEST_USER.email}`);

		// Create admin user
		const adminResult = await auth.api.signUpEmail({
			body: {
				email: ADMIN_USER.email,
				password: ADMIN_USER.password,
				name: ADMIN_USER.lastName,
				firstName: ADMIN_USER.firstName,
				affiliationId: adminAffiliation.id,
			},
		});

		if (!adminResult?.user) {
			throw new Error("Failed to create admin user");
		}

		await prisma.user.update({
			where: { id: adminResult.user.id },
			data: { emailVerified: true, isActive: true, role: "ADMIN", affiliationId: adminAffiliation.id },
		});

		console.log(`✅ Admin user created: ${ADMIN_USER.email}`);

		// Create reviewer user
		const reviewerResult = await auth.api.signUpEmail({
			body: {
				email: REVIEWER_USER.email,
				password: REVIEWER_USER.password,
				name: REVIEWER_USER.lastName,
				firstName: REVIEWER_USER.firstName,
				affiliationId: reviewerAffiliation.id,
			},
		});

		if (!reviewerResult?.user) {
			throw new Error("Failed to create reviewer user");
		}

		await prisma.user.update({
			where: { id: reviewerResult.user.id },
			data: { emailVerified: true, isActive: true, role: "REVIEWER", affiliationId: reviewerAffiliation.id },
		});

		console.log(`✅ Reviewer user created: ${REVIEWER_USER.email}`);

		// Create editor user
		const editorResult = await auth.api.signUpEmail({
			body: {
				email: EDITOR_USER.email,
				password: EDITOR_USER.password,
				name: EDITOR_USER.lastName,
				firstName: EDITOR_USER.firstName,
				affiliationId: editorAffiliation.id,
			},
		});

		if (!editorResult?.user) {
			throw new Error("Failed to create editor user");
		}

		await prisma.user.update({
			where: { id: editorResult.user.id },
			data: { emailVerified: true, isActive: true, role: "EDITOR", affiliationId: editorAffiliation.id },
		});

		console.log(`✅ Editor user created: ${EDITOR_USER.email}`);

		// Create unverified user (for email verification tests)
		const unverifiedResult = await auth.api.signUpEmail({
			body: {
				email: UNVERIFIED_USER.email,
				password: UNVERIFIED_USER.password,
				name: UNVERIFIED_USER.lastName,
				firstName: UNVERIFIED_USER.firstName,
				affiliationId: unverifiedAffiliation.id,
			},
		});

		if (!unverifiedResult?.user) {
			throw new Error("Failed to create unverified user");
		}

		// Keep emailVerified: false (default) but mark as active
		await prisma.user.update({
			where: { id: unverifiedResult.user.id },
			data: { isActive: true, affiliationId: unverifiedAffiliation.id },
		});

		console.log(`✅ Unverified user created: ${UNVERIFIED_USER.email}`);

		// Create admin verify test user (for destructive admin panel tests)
		const adminVerifyTestResult = await auth.api.signUpEmail({
			body: {
				email: ADMIN_VERIFY_TEST_USER.email,
				password: ADMIN_VERIFY_TEST_USER.password,
				name: ADMIN_VERIFY_TEST_USER.lastName,
				firstName: ADMIN_VERIFY_TEST_USER.firstName,
				affiliationId: adminVerifyTestAffiliation.id,
			},
		});

		if (!adminVerifyTestResult?.user) {
			throw new Error("Failed to create admin verify test user");
		}

		// Keep emailVerified: false (default) but mark as active
		await prisma.user.update({
			where: { id: adminVerifyTestResult.user.id },
			data: { isActive: true, affiliationId: adminVerifyTestAffiliation.id },
		});

		console.log(`✅ Admin verify test user created: ${ADMIN_VERIFY_TEST_USER.email}`);

		// Create reset password test user (for destructive password reset tests)
		const resetPasswordResult = await auth.api.signUpEmail({
			body: {
				email: RESET_PASSWORD_USER.email,
				password: RESET_PASSWORD_USER.password,
				name: RESET_PASSWORD_USER.lastName,
				firstName: RESET_PASSWORD_USER.firstName,
				affiliationId: resetPasswordAffiliation.id,
			},
		});

		if (!resetPasswordResult?.user) {
			throw new Error("Failed to create reset password test user");
		}

		await prisma.user.update({
			where: { id: resetPasswordResult.user.id },
			data: { emailVerified: true, isActive: true, affiliationId: resetPasswordAffiliation.id },
		});

		console.log(`✅ Reset password test user created: ${RESET_PASSWORD_USER.email}`);

		// ============================================================
		// SEED APP SETTINGS
		// ============================================================

		// Email templates
		for (const template of DEFAULT_EMAIL_TEMPLATES) {
			await prisma.emailTemplate.upsert({
				where: { eventType: template.eventType },
				update: {},
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
			{ key: "REQUIRE_ORCID", value: false },
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

	} catch (error) {
		console.error("❌ Global setup failed:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

export default globalSetup;
