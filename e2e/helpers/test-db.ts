/**
 * Test database helpers for E2E tests
 * Use these in the Arrange phase of tests to seed data
 */

import { PrismaClient } from "../../src/generated/prisma/client";
import {
	type AppSettingKey,
	AssignmentStatus,
	type EmailEventType,
	EditorDecisionType,
	ReviewDecision,
	SubmissionStatus,
	SubmissionType,
	UserRole,
} from "../../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import { TEST_USER, ADMIN_USER, REVIEWER_USER, EDITOR_USER, DEFAULT_PASSWORD } from "./test-users";

// Lazy-initialized Prisma client
let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
	if (!prismaInstance) {
		const connectionString = process.env.DATABASE_URL;
		const adapter = new PrismaPg({ connectionString });
		prismaInstance = new PrismaClient({ adapter });
	}
	return prismaInstance;
}

export const prisma = {
	get client() {
		return getPrisma();
	},
};

// Test user IDs (set by global-setup, retrieved here)
let cachedUserIds: { testUserId: string; adminUserId: string; reviewerUserId: string; editorUserId: string } | null = null;

export async function getTestUserIds() {
	if (cachedUserIds) return cachedUserIds;

	const db = getPrisma();
	const [testUser, adminUser, reviewerUser, editorUser] = await Promise.all([
		db.user.findUnique({ where: { email: TEST_USER.email } }),
		db.user.findUnique({ where: { email: ADMIN_USER.email } }),
		db.user.findUnique({ where: { email: REVIEWER_USER.email } }),
		db.user.findUnique({ where: { email: EDITOR_USER.email } }),
	]);

	if (!testUser || !adminUser || !reviewerUser || !editorUser) {
		throw new Error("Test users not found. Did global-setup run?");
	}

	cachedUserIds = {
		testUserId: testUser.id,
		adminUserId: adminUser.id,
		reviewerUserId: reviewerUser.id,
		editorUserId: editorUser.id,
	};

	return cachedUserIds;
}

// Submission creation helper
export interface CreateSubmissionOptions {
	testRunId?: string; // prefix for title to enable cleanup
	title: string;
	status?: SubmissionStatus;
	type?: SubmissionType;
	content?: string;
	userId?: string; // defaults to test user
	withAuthor?: boolean;
	/** Custom author data (overrides default Test Author) */
	authorData?: {
		firstName: string;
		lastName: string;
		email?: string;
		affiliationName?: string;
	};
	/** Additional authors to create */
	extraAuthors?: Array<{
		firstName: string;
		lastName: string;
		email?: string;
		affiliationName?: string;
		isPresenter?: boolean;
		userId?: string;
	}>;
	/** Keywords to attach to the submission */
	keywords?: string[];
	/** Session ID to assign to the submission */
	sessionId?: string;
}

export async function createSubmission(options: CreateSubmissionOptions): Promise<{
	id: string;
	title: string;
	status: SubmissionStatus;
}> {
	const db = getPrisma();
	const { testUserId } = await getTestUserIds();

	// Prefix title with testRunId for cleanup isolation
	const prefixedTitle = options.testRunId ? `${options.testRunId}_${options.title}` : options.title;

	const submission = await db.submission.create({
		data: {
			userId: options.userId ?? testUserId,
			type: options.type ?? SubmissionType.ABSTRACT,
			title: prefixedTitle,
			content:
				options.content ??
				"This is test content for E2E testing. ".repeat(20) + // ~500 chars
					"Additional padding to meet minimum requirements.",
			status: options.status ?? SubmissionStatus.SUBMITTED,
			currentRound: 1,
			sessionId: options.sessionId ?? null,
		},
	});

	// Add author if requested
	if (options.withAuthor !== false) {
		const ad = options.authorData;
		const affiliationName = ad?.affiliationName ?? "Test University";
		const affiliation = await db.affiliation.upsert({
			where: { name: affiliationName },
			update: {},
			create: { name: affiliationName },
		});

		const author = await db.submissionAuthor.create({
			data: {
				submissionId: submission.id,
				email: ad?.email ?? `author-${submission.id.slice(0, 8)}@test.com`,
				firstName: ad?.firstName ?? "Test",
				lastName: ad?.lastName ?? "Author",
				affiliationId: affiliation.id,
				orderIndex: 1,
				isPresenter: true,
			},
		});

		await db.submission.update({
			where: { id: submission.id },
			data: { presenterId: author.id },
		});

		// Add extra authors
		if (options.extraAuthors) {
			for (let i = 0; i < options.extraAuthors.length; i++) {
				const extra = options.extraAuthors[i];
				const extraAffName = extra.affiliationName ?? "Test University";
				const extraAff = await db.affiliation.upsert({
					where: { name: extraAffName },
					update: {},
					create: { name: extraAffName },
				});
				await db.submissionAuthor.create({
					data: {
						submissionId: submission.id,
						email: extra.email ?? `extra-author-${i}-${submission.id.slice(0, 8)}@test.com`,
						firstName: extra.firstName,
						lastName: extra.lastName,
						affiliationId: extraAff.id,
						orderIndex: i + 2,
						isPresenter: extra.isPresenter ?? false,
						userId: extra.userId ?? null,
					},
				});
			}
		}
	}

	// Add keywords if provided
	if (options.keywords?.length) {
		for (const keyword of options.keywords) {
			const kw = await db.keyword.upsert({
				where: { name: keyword },
				update: {},
				create: { name: keyword },
			});
			await db.submissionKeyword.create({
				data: {
					submissionId: submission.id,
					keywordId: kw.id,
				},
			});
		}
	}

	// Add status history
	if (options.status && options.status !== SubmissionStatus.DRAFT) {
		await db.submissionStatusHistory.create({
			data: {
				submissionId: submission.id,
				fromStatus: SubmissionStatus.DRAFT,
				toStatus: options.status,
				round: 1,
				event: "SUBMIT",
				reason: "Test submission",
			},
		});
	}

	return {
		id: submission.id,
		title: submission.title,
		status: submission.status,
	};
}

// Create submission with reviewer assignment
export interface CreateSubmissionWithAssignmentOptions extends CreateSubmissionOptions {
	reviewerId?: string; // defaults to reviewer user
	assignmentStatus?: AssignmentStatus;
}

export async function createSubmissionWithAssignment(
	options: CreateSubmissionWithAssignmentOptions
): Promise<{
	submissionId: string;
	assignmentId: string;
	title: string;
}> {
	const db = getPrisma();
	const { adminUserId, reviewerUserId } = await getTestUserIds();

	// Create submission in UNDER_REVIEW status
	const submission = await createSubmission({
		...options,
		status: SubmissionStatus.UNDER_REVIEW,
	});

	// Create assignment
	const assignment = await db.reviewAssignment.create({
		data: {
			submissionId: submission.id,
			reviewerId: options.reviewerId ?? reviewerUserId,
			round: 1,
			status: options.assignmentStatus ?? AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			assignedBy: adminUserId,
			orderIndex: 0,
		},
	});

	// Add status history for UNDER_REVIEW
	await db.submissionStatusHistory.create({
		data: {
			submissionId: submission.id,
			fromStatus: SubmissionStatus.SUBMITTED,
			toStatus: SubmissionStatus.UNDER_REVIEW,
			round: 1,
			event: "ASSIGN_REVIEWER",
			reason: "Reviewer assigned",
		},
	});

	return {
		submissionId: submission.id,
		assignmentId: assignment.id,
		title: submission.title,
	};
}

// Create submission with completed review (AWAITING_DECISION)
export interface CreateSubmissionWithReviewOptions extends CreateSubmissionOptions {
	reviewerId?: string;
	reviewDecision?: ReviewDecision;
}

export async function createSubmissionWithReview(
	options: CreateSubmissionWithReviewOptions
): Promise<{
	submissionId: string;
	assignmentId: string;
	reviewId: string;
	title: string;
}> {
	const db = getPrisma();
	const { adminUserId, reviewerUserId } = await getTestUserIds();

	// Create submission in AWAITING_DECISION status
	const submission = await createSubmission({
		...options,
		status: SubmissionStatus.AWAITING_DECISION,
	});

	const reviewerId = options.reviewerId ?? reviewerUserId;

	// Create completed assignment
	const assignment = await db.reviewAssignment.create({
		data: {
			submissionId: submission.id,
			reviewerId,
			round: 1,
			status: AssignmentStatus.COMPLETED,
			deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			assignedBy: adminUserId,
			startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
			completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
			orderIndex: 0,
		},
	});

	// Create review
	const review = await db.review.create({
		data: {
			assignmentId: assignment.id,
			submissionId: submission.id,
			reviewerId,
			round: 1,
			decision: options.reviewDecision ?? ReviewDecision.ACCEPT,
			comments: "This is a test review with detailed feedback for the submission.",
			privateNotes: "Private notes for editors.",
			scores: { Originality: 4, Clarity: 5, Significance: 4, Methodology: 4 },
			confidenceLevel: 4,
		},
	});

	// Add status history
	await db.submissionStatusHistory.create({
		data: {
			submissionId: submission.id,
			fromStatus: SubmissionStatus.UNDER_REVIEW,
			toStatus: SubmissionStatus.AWAITING_DECISION,
			round: 1,
			event: "COMPLETE_REVIEWS",
			reason: "All reviews completed",
		},
	});

	return {
		submissionId: submission.id,
		assignmentId: assignment.id,
		reviewId: review.id,
		title: submission.title,
	};
}

// Create submission with editor decision (terminal state)
export interface CreateSubmissionWithDecisionOptions extends CreateSubmissionOptions {
	reviewerId?: string;
	editorDecision?: EditorDecisionType;
}

const decisionToStatus: Record<EditorDecisionType, SubmissionStatus> = {
	[EditorDecisionType.ACCEPT]: SubmissionStatus.ACCEPTED,
	[EditorDecisionType.REJECT]: SubmissionStatus.REJECTED,
	[EditorDecisionType.CONDITIONALLY_ACCEPT]: SubmissionStatus.CONDITIONALLY_ACCEPTED,
	[EditorDecisionType.REVISE_AND_RESUBMIT]: SubmissionStatus.REVISE_REQUIRED,
};

export async function createSubmissionWithDecision(
	options: CreateSubmissionWithDecisionOptions
): Promise<{
	submissionId: string;
	title: string;
}> {
	const db = getPrisma();
	const { adminUserId } = await getTestUserIds();

	const decision = options.editorDecision ?? EditorDecisionType.ACCEPT;
	const targetStatus = decisionToStatus[decision];

	// Create submission with review (AWAITING_DECISION)
	const { submissionId, title } = await createSubmissionWithReview({
		...options,
	});

	// Add editor decision
	await db.editorDecision.create({
		data: {
			submissionId,
			editorId: adminUserId,
			round: 1,
			decision,
			reasoning: "Test decision",
			letterToAuthor: "Test letter to author",
		},
	});

	// Update submission status
	await db.submission.update({
		where: { id: submissionId },
		data: { status: targetStatus },
	});

	// Add status history
	await db.submissionStatusHistory.create({
		data: {
			submissionId,
			fromStatus: SubmissionStatus.AWAITING_DECISION,
			toStatus: targetStatus,
			round: 1,
			event: "EDITOR_DECISION",
			reason: `Editor decision: ${decision}`,
		},
	});

	return { submissionId, title };
}

// Cleanup helper - delete submission and related data
export async function deleteSubmission(submissionId: string): Promise<void> {
	const db = getPrisma();

	// Clean up sent reminders for assignments and submission
	const assignments = await db.reviewAssignment.findMany({
		where: { submissionId },
		select: { id: true },
	});
	for (const a of assignments) {
		await db.sentReminder.deleteMany({ where: { entityId: a.id } });
	}
	await db.sentReminder.deleteMany({ where: { entityId: submissionId } });

	// Delete in order respecting FK constraints
	await db.review.deleteMany({ where: { submissionId } });
	await db.reviewAssignment.deleteMany({ where: { submissionId } });
	await db.editorDecision.deleteMany({ where: { submissionId } });
	await db.submissionStatusHistory.deleteMany({ where: { submissionId } });
	await db.submissionKeyword.deleteMany({ where: { submissionId } });
	await db.submission.update({
		where: { id: submissionId },
		data: { presenterId: null, currentVersionId: null },
	});
	await db.submissionAuthor.deleteMany({ where: { submissionId } });

	// Clean up ALL files for this submission (S3 + DB)
	// Query by entityId directly — catches orphaned files not linked to any version
	const allFiles = await db.file.findMany({
		where: { entityId: submissionId },
		select: { id: true, storageKey: true },
	});
	if (allFiles.length > 0) {
		const { deleteFile } = await import("../../src/lib/server/storage");
		for (const f of allFiles) {
			await deleteFile(f.storageKey).catch(() => {});
		}
		// Unlink files from versions before deleting file records
		await db.submissionVersion.updateMany({
			where: { submissionId },
			data: { fileId: null },
		});
		await db.file.deleteMany({ where: { id: { in: allFiles.map((f) => f.id) } } });
	}

	await db.submissionVersion.deleteMany({ where: { submissionId } });
	await db.submission.delete({ where: { id: submissionId } });
}

// Cleanup all test submissions (for use in afterAll if needed)
export async function cleanupTestSubmissions(): Promise<void> {
	const db = getPrisma();
	const { testUserId } = await getTestUserIds();

	const submissions = await db.submission.findMany({
		where: { userId: testUserId },
		select: { id: true },
	});

	for (const sub of submissions) {
		await deleteSubmission(sub.id);
	}
}

// Create assignment with custom deadline (for overdue testing)
export interface CreateOverdueAssignmentOptions extends CreateSubmissionOptions {
	reviewerId?: string;
	assignmentStatus?: AssignmentStatus;
	deadline?: Date;
}

export async function createAssignmentWithDeadline(
	options: CreateOverdueAssignmentOptions
): Promise<{
	submissionId: string;
	assignmentId: string;
	title: string;
}> {
	const db = getPrisma();
	const { adminUserId, reviewerUserId } = await getTestUserIds();

	const submission = await createSubmission({
		...options,
		status: SubmissionStatus.UNDER_REVIEW,
	});

	const assignment = await db.reviewAssignment.create({
		data: {
			submissionId: submission.id,
			reviewerId: options.reviewerId ?? reviewerUserId,
			round: 1,
			status: options.assignmentStatus ?? AssignmentStatus.PENDING,
			deadline: options.deadline ?? new Date(Date.now() - 24 * 60 * 60 * 1000), // default: 1 day ago
			assignedBy: adminUserId,
			orderIndex: 0,
		},
	});

	return {
		submissionId: submission.id,
		assignmentId: assignment.id,
		title: submission.title,
	};
}

// Get assignment status
export async function getAssignmentStatus(assignmentId: string): Promise<AssignmentStatus | null> {
	const db = getPrisma();
	const assignment = await db.reviewAssignment.findUnique({
		where: { id: assignmentId },
		select: { status: true },
	});
	return assignment?.status ?? null;
}

// Fee creation helper
// NOTE: Creating a fee = payment received (admin assigns fee after payment)
export interface CreateFeeOptions {
	userId: string;
	type?: "FULL" | "STUDENT" | "INVITED" | "STAFF" | "CASH";
	amount?: number;
	currency?: string;
	paidAt?: Date;
}

export async function createFee(options: CreateFeeOptions): Promise<{ id: string }> {
	const db = getPrisma();

	const fee = await db.fee.create({
		data: {
			userId: options.userId,
			type: options.type ?? "FULL",
			amount: options.amount ?? 150.0,
			currency: options.currency ?? "USD",
			paid: true, // Fee existence = payment received
			paidAt: options.paidAt ?? new Date(),
		},
	});

	return { id: fee.id };
}

// Delete fee helper
export async function deleteFee(userId: string): Promise<void> {
	const db = getPrisma();
	await db.fee.deleteMany({ where: { userId } });
}

// Test user creation helper for per-test isolation
export interface CreateTestUserOptions {
	email: string;
	password?: string;
	firstName?: string;
	lastName?: string;
	affiliationName?: string;
	emailVerified?: boolean;
	role?: UserRole;
}

export async function createTestUser(
	options: CreateTestUserOptions
): Promise<{ id: string; email: string; affiliationId: string }> {
	const db = getPrisma();

	// Create unique affiliation (avoid conflicts in parallel tests)
	const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	const affiliationName = options.affiliationName || `E2E Test Affiliation ${uniqueId}`;
	const affiliation = await db.affiliation.create({
		data: { name: affiliationName },
	});

	// Use Better Auth signup (handles password hashing and account creation)
	const { auth } = await import("../../auth.server");
	const result = await auth.api.signUpEmail({
		body: {
			email: options.email,
			password: options.password || DEFAULT_PASSWORD,
			name: options.lastName || "User",
			firstName: options.firstName || "Test",
			affiliationId: affiliation.id,
		},
	});

	if (!result?.user) {
		throw new Error(`Failed to create test user: ${options.email}`);
	}

	// Update user with test-specific settings
	await db.user.update({
		where: { id: result.user.id },
		data: {
			emailVerified: options.emailVerified ?? true,
			isActive: true,
			role: options.role || UserRole.AUTHOR,
			affiliationId: affiliation.id,
		},
	});

	return { id: result.user.id, email: options.email, affiliationId: affiliation.id };
}

// Delete test user and all related data
export async function deleteTestUser(userId: string): Promise<void> {
	const db = getPrisma();

	// Unlink co-author references before deleting user
	await db.submissionAuthor.updateMany({
		where: { userId },
		data: { userId: null },
	});

	// Delete in order respecting FK constraints
	await db.fee.deleteMany({ where: { userId } });
	await db.session.deleteMany({ where: { userId } });
	await db.account.deleteMany({ where: { userId } });

	// Delete submissions and related data
	const submissions = await db.submission.findMany({
		where: { userId },
		select: { id: true },
	});

	for (const sub of submissions) {
		await deleteSubmission(sub.id);
	}

	// Delete user
	await db.user.delete({ where: { id: userId } });
}

// Create submission with file attachment
export interface CreateSubmissionWithFileOptions extends CreateSubmissionOptions {
	/** Path to a fixture file to upload (relative to project root) */
	fixturePath?: string;
	/** File name for the uploaded file */
	fileName?: string;
	/** MIME type */
	mimeType?: string;
}

export async function createSubmissionWithFile(
	options: CreateSubmissionWithFileOptions,
): Promise<{
	id: string;
	title: string;
	fileId: string;
	versionId: string;
	storageKey: string;
}> {
	const fs = await import("fs");
	const path = await import("path");
	const db = getPrisma();
	const { testUserId } = await getTestUserIds();

	// Create submission (FULL_PAPER by default for file submissions)
	const submission = await createSubmission({
		...options,
		type: options.type ?? SubmissionType.FULL_PAPER,
	});

	// Read fixture file
	const fixturePath = options.fixturePath ?? "e2e/submissions/fixtures/document.pdf";
	const absolutePath = path.resolve(fixturePath);
	const fileBuffer = fs.readFileSync(absolutePath);
	const fileName = options.fileName ?? path.basename(absolutePath);
	const mimeType = options.mimeType ?? "application/pdf";

	// Upload to S3
	const { uploadFile, generateSubmissionFileKey } = await import("../../src/lib/server/storage");
	const storageKey = generateSubmissionFileKey(submission.id, 1, fileName);
	await uploadFile(Buffer.from(fileBuffer), storageKey, mimeType);

	// Create File record
	const file = await db.file.create({
		data: {
			entityType: "SUBMISSION_VERSION",
			entityId: submission.id,
			type: "SUBMISSION_MAIN",
			storageKey,
			fileName,
			originalName: fileName,
			mimeType,
			size: fileBuffer.length,
			uploadedById: options.userId ?? testUserId,
		},
	});

	// Create SubmissionVersion and link file
	const version = await db.submissionVersion.create({
		data: {
			submissionId: submission.id,
			version: 1,
			title: submission.title,
			content: options.content ?? "",
			fileId: file.id,
		},
	});

	// Set current version
	await db.submission.update({
		where: { id: submission.id },
		data: { currentVersionId: version.id },
	});

	return {
		id: submission.id,
		title: submission.title,
		fileId: file.id,
		versionId: version.id,
		storageKey,
	};
}

/**
 * Create a conference session
 */
export async function createSession(
	testRunId: string,
	name: string,
	supervisorId?: string,
	isActive = true,
): Promise<string> {
	const db = getPrisma();
	const session = await db.conferenceSession.create({
		data: {
			name: `${testRunId}_${name}`,
			supervisorId: supervisorId || null,
			isActive,
		},
	});
	return session.id;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
	const db = getPrisma();
	await db.conferenceSession.delete({ where: { id: sessionId } });
}

/** Set an app setting directly (for test arrangement) */
export async function setAppSetting(key: AppSettingKey, value: unknown): Promise<void> {
	const db = getPrisma();
	await db.appSetting.upsert({
		where: { key },
		update: { value: value as object },
		create: { key, value: value as object },
	});
}

/** Clean up sent reminders for a specific entity */
export async function cleanupSentReminders(entityId: string): Promise<void> {
	const db = getPrisma();
	await db.sentReminder.deleteMany({ where: { entityId } });
}

/** Create a sent reminder record (for test arrangement) */
export async function createSentReminder(opts: {
	userId: string;
	reminderType: EmailEventType;
	entityId: string;
	reminderIndex?: number;
}): Promise<void> {
	const db = getPrisma();
	await db.sentReminder.create({
		data: {
			userId: opts.userId,
			reminderType: opts.reminderType,
			entityId: opts.entityId,
			reminderIndex: opts.reminderIndex ?? 0,
		},
	});
}

/** Create a survey question */
export async function createSurveyQuestion(label: string, orderIndex: number): Promise<{ id: string }> {
	const db = getPrisma();
	return db.surveyQuestion.create({
		data: { label, orderIndex, isActive: true },
	});
}

/** Delete a survey question and its answers */
export async function deleteSurveyQuestion(questionId: string): Promise<void> {
	const db = getPrisma();
	await db.surveyAnswer.deleteMany({ where: { questionId } });
	await db.surveyQuestion.delete({ where: { id: questionId } }).catch(() => {});
}

/** Get user's survey answers */
export async function getUserSurveyAnswers(userId: string) {
	const db = getPrisma();
	return db.surveyAnswer.findMany({
		where: { userId },
		include: { question: true },
	});
}

/** Delete all survey answers for a user */
export async function deleteUserSurveyAnswers(userId: string): Promise<void> {
	const db = getPrisma();
	await db.surveyAnswer.deleteMany({ where: { userId } });
}
