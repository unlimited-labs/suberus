import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { auth } from "../../auth";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
config({ path: resolve(__dirname, "../../.env.local") });

const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
	firstName: "Test",
	lastName: "User",
	affiliationName: "Test University",
};

const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
	firstName: "Admin",
	lastName: "User",
	affiliationName: "Admin University",
};

const REVIEWER_USER = {
	email: "reviewer@e2e.local",
	password: "testpass123",
	firstName: "Reviewer",
	lastName: "User",
	affiliationName: "Reviewer University",
};

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
		maxRevisions: 2,
		enableScoring: true,
		scoringCriteria: ["Originality", "Clarity", "Significance", "Methodology"],
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
		maxRevisions: 0,
		enableScoring: false,
		scoringCriteria: [],
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
		maxRevisions: 3,
		enableScoring: true,
		scoringCriteria: ["Originality", "Clarity", "Significance", "Methodology", "Technical Quality"],
	},
};

async function globalSetup() {
	const connectionString = process.env.DATABASE_URL;
	const adapter = new PrismaPg({ connectionString });
	const prisma = new PrismaClient({ adapter });

	try {
		// Clean up all test data (order matters due to FK constraints)
		await prisma.review.deleteMany();
		await prisma.reviewAssignment.deleteMany();
		await prisma.editorDecision.deleteMany();
		await prisma.submissionStatusHistory.deleteMany();
		await prisma.submissionKeyword.deleteMany();
		await prisma.submission.updateMany({
			data: { presenterId: null, currentVersionId: null },
		});
		await prisma.submissionAuthor.deleteMany();
		await prisma.submissionVersion.deleteMany();
		await prisma.submission.deleteMany();
		await prisma.session.deleteMany();
		await prisma.account.deleteMany();
		await prisma.fee.deleteMany();
		await prisma.user.deleteMany();

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
			data: { emailVerified: true, isActive: true },
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
			data: { emailVerified: true, isActive: true, role: "ADMIN" },
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
			data: { emailVerified: true, isActive: true, role: "REVIEWER" },
		});

		console.log(`✅ Reviewer user created: ${REVIEWER_USER.email}`);

		// ============================================================
		// SEED APP SETTINGS
		// ============================================================

		// Email template
		await prisma.emailTemplate.upsert({
			where: { eventType: "SUBMISSION_RECEIVED" },
			update: {},
			create: {
				eventType: "SUBMISSION_RECEIVED",
				subject: "Submission Received: {{submissionTitle}}",
				body: 'Dear {{authorName}},\n\nYour submission "{{submissionTitle}}" has been received.\n\nSubmission ID: {{submissionId}}\n\nThank you for your submission.',
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["authorName", "submissionTitle", "submissionId"],
				description: "Sent when a new submission is created",
			},
		});

		console.log("✅ Email template seeded");

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

	} catch (error) {
		console.error("❌ Global setup failed:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

export default globalSetup;
