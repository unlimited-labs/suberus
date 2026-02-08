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

const EDITOR_USER = {
	email: "editor@e2e.local",
	password: "testpass123",
	firstName: "Editor",
	lastName: "User",
	affiliationName: "Editor University",
};

// Unverified user for email verification tests
const UNVERIFIED_USER = {
	email: "unverified@e2e.local",
	password: "testpass123",
	firstName: "Unverified",
	lastName: "User",
	affiliationName: "Unverified University",
};

// Separate unverified user for admin panel tests (destructive test - gets verified)
const ADMIN_VERIFY_TEST_USER = {
	email: "admin-verify-test@e2e.local",
	password: "testpass123",
	firstName: "AdminVerify",
	lastName: "Test",
	affiliationName: "AdminVerify University",
};

// Separate user for password reset tests (destructive test - password gets changed)
const RESET_PASSWORD_USER = {
	email: "reset-test@e2e.local",
	password: "testpass123",
	firstName: "Reset",
	lastName: "Test",
	affiliationName: "Password Reset Institute",
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

		await prisma.emailTemplate.upsert({
			where: { eventType: "EMAIL_VERIFICATION" },
			update: {},
			create: {
				eventType: "EMAIL_VERIFICATION",
				subject: "Verify your email - {{conferenceName}}",
				body: "Hello {{firstName}},\n\nPlease click the link below to verify your email address:\n\n{{verificationUrl}}\n\nThis link expires in 24 hours.\n\nBest regards,\n{{conferenceName}}",
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["firstName", "verificationUrl", "conferenceName"],
				description: "Sent when a new user registers to verify their email",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "PASSWORD_RESET" },
			update: {},
			create: {
				eventType: "PASSWORD_RESET",
				subject: "Reset your password - {{conferenceName}}",
				body: "Hello {{firstName}},\n\nClick the link below to reset your password:\n\n{{resetUrl}}\n\nThis link expires in 1 hour.\n\nBest regards,\n{{conferenceName}}",
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["firstName", "resetUrl", "conferenceName"],
				description: "Sent when a user requests a password reset",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "SUBMISSION_WITHDRAWN" },
			update: {},
			create: {
				eventType: "SUBMISSION_WITHDRAWN",
				subject: "Submission Withdrawn: {{submissionTitle}}",
				body: 'Dear {{authorName}},\n\nYour submission "{{submissionTitle}}" (ID: {{submissionId}}) has been withdrawn.\n\nIf you did not request this, please contact us immediately.',
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["authorName", "submissionTitle", "submissionId"],
				description: "Sent when an author withdraws their submission",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "REVIEWER_ASSIGNED" },
			update: {},
			create: {
				eventType: "REVIEWER_ASSIGNED",
				subject: "New Review Assignment: {{submissionTitle}}",
				body: "Dear {{reviewerName}},\n\nYou have been assigned to review the submission:\n\nTitle: {{submissionTitle}}\nDeadline: {{deadline}}\n\nPlease log in to the system to begin your review.",
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["reviewerName", "submissionTitle", "deadline"],
				description: "Sent when a reviewer is assigned to a submission",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "REVIEWER_REMINDER" },
			update: {},
			create: {
				eventType: "REVIEWER_REMINDER",
				subject: "Review Reminder: {{submissionTitle}}",
				body: "Dear {{reviewerName}},\n\nThis is a reminder that your review for the submission:\n\nTitle: {{submissionTitle}}\nDeadline: {{deadline}}\n\nis approaching its deadline. Please submit your review as soon as possible.",
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["reviewerName", "submissionTitle", "deadline"],
				description: "Sent as a reminder to reviewers about upcoming deadlines",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "REVIEW_SUBMITTED" },
			update: {},
			create: {
				eventType: "REVIEW_SUBMITTED",
				subject: "Review Submitted for: {{submissionTitle}}",
				body: "Dear Editor,\n\nA review has been submitted for the submission:\n\nTitle: {{submissionTitle}}\nReviewer: {{reviewerName}}\n\nPlease log in to view the review details.",
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["submissionTitle", "reviewerName"],
				description: "Sent to editors when a reviewer submits their review",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "ALL_REVIEWS_COMPLETE" },
			update: {},
			create: {
				eventType: "ALL_REVIEWS_COMPLETE",
				subject: "All Reviews Complete: {{submissionTitle}}",
				body: "Dear Editor,\n\nAll reviews have been completed for the submission:\n\nTitle: {{submissionTitle}}\nSubmission ID: {{submissionId}}\n\nPlease log in to make a decision.",
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["submissionTitle", "submissionId"],
				description: "Sent to editors when all reviews for a submission are complete",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "DECISION_ACCEPTED" },
			update: {},
			create: {
				eventType: "DECISION_ACCEPTED",
				subject: "Submission Accepted: {{submissionTitle}}",
				body: 'Dear {{authorName}},\n\nWe are pleased to inform you that your submission "{{submissionTitle}}" has been accepted.\n\n{{letterToAuthor}}\n\nCongratulations!',
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["authorName", "submissionTitle", "letterToAuthor"],
				description: "Sent when a submission is accepted",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "DECISION_CONDITIONALLY_ACCEPTED" },
			update: {},
			create: {
				eventType: "DECISION_CONDITIONALLY_ACCEPTED",
				subject: "Submission Conditionally Accepted: {{submissionTitle}}",
				body: 'Dear {{authorName}},\n\nYour submission "{{submissionTitle}}" has been conditionally accepted.\n\n{{letterToAuthor}}\n\nPlease address the conditions outlined above.',
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["authorName", "submissionTitle", "letterToAuthor"],
				description: "Sent when a submission is conditionally accepted",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "DECISION_REVISE_REQUIRED" },
			update: {},
			create: {
				eventType: "DECISION_REVISE_REQUIRED",
				subject: "Revision Required: {{submissionTitle}}",
				body: 'Dear {{authorName}},\n\nYour submission "{{submissionTitle}}" requires revisions.\n\n{{letterToAuthor}}\n\nPlease resubmit your revised version through the system.',
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["authorName", "submissionTitle", "letterToAuthor"],
				description: "Sent when a submission requires revisions",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "DECISION_REJECTED" },
			update: {},
			create: {
				eventType: "DECISION_REJECTED",
				subject: "Submission Decision: {{submissionTitle}}",
				body: 'Dear {{authorName}},\n\nWe regret to inform you that your submission "{{submissionTitle}}" has not been accepted.\n\n{{letterToAuthor}}\n\nThank you for your interest.',
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["authorName", "submissionTitle", "letterToAuthor"],
				description: "Sent when a submission is rejected",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "REVISION_RECEIVED" },
			update: {},
			create: {
				eventType: "REVISION_RECEIVED",
				subject: "Revised Submission Received: {{submissionTitle}}",
				body: "Dear Editor,\n\nA revised version of the submission has been received:\n\nTitle: {{submissionTitle}}\nAuthor: {{authorName}}\nVersion: {{versionNumber}}\n\nPlease log in to review the changes.",
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["submissionTitle", "authorName", "versionNumber"],
				description: "Sent to editors when an author resubmits a revised submission",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "REVISION_REMINDER" },
			update: {},
			create: {
				eventType: "REVISION_REMINDER",
				subject: "Revision Reminder: {{submissionTitle}}",
				body: 'Dear {{authorName}},\n\nThis is a reminder that your revised submission "{{submissionTitle}}" is expected.\n\nPlease submit your revision as soon as possible.',
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["authorName", "submissionTitle"],
				description: "Sent as a reminder to authors about pending revisions",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "DEADLINE_APPROACHING" },
			update: {},
			create: {
				eventType: "DEADLINE_APPROACHING",
				subject: "Deadline Approaching: {{submissionTitle}}",
				body: "Dear {{recipientName}},\n\nThe deadline for {{submissionTitle}} is approaching on {{deadline}}.\n\nPlease ensure you complete your tasks on time.",
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["recipientName", "submissionTitle", "deadline"],
				description: "Sent when a deadline is approaching",
			},
		});

		await prisma.emailTemplate.upsert({
			where: { eventType: "ACCOUNT_CREATED" },
			update: {},
			create: {
				eventType: "ACCOUNT_CREATED",
				subject: "Welcome to {{conferenceName}}",
				body: "Dear {{firstName}},\n\nYour account has been created successfully.\n\nPlease verify your email address to get started.\n\nBest regards,\n{{conferenceName}}",
				isEnabled: true,
				isHtml: false,
				ccEmails: [],
				bccEmails: [],
				availablePlaceholders: ["firstName", "conferenceName"],
				description: "Sent when a new user account is created",
			},
		});

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

	} catch (error) {
		console.error("❌ Global setup failed:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

export default globalSetup;
