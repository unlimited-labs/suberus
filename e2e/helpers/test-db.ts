/**
 * Test database helpers for E2E tests
 * Use these in the Arrange phase of tests to seed data
 */

import { PrismaClient } from "../../src/generated/prisma/client";
import {
	AssignmentStatus,
	ReviewDecision,
	SubmissionStatus,
	SubmissionType,
} from "../../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";

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
let cachedUserIds: { testUserId: string; adminUserId: string; reviewerUserId: string } | null = null;

export async function getTestUserIds() {
	if (cachedUserIds) return cachedUserIds;

	const db = getPrisma();
	const [testUser, adminUser, reviewerUser] = await Promise.all([
		db.user.findUnique({ where: { email: "test@e2e.local" } }),
		db.user.findUnique({ where: { email: "admin@e2e.local" } }),
		db.user.findUnique({ where: { email: "reviewer@e2e.local" } }),
	]);

	if (!testUser || !adminUser || !reviewerUser) {
		throw new Error("Test users not found. Did global-setup run?");
	}

	cachedUserIds = {
		testUserId: testUser.id,
		adminUserId: adminUser.id,
		reviewerUserId: reviewerUser.id,
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
		},
	});

	// Add author if requested
	if (options.withAuthor !== false) {
		const affiliation = await db.affiliation.upsert({
			where: { name: "Test University" },
			update: {},
			create: { name: "Test University" },
		});

		const author = await db.submissionAuthor.create({
			data: {
				submissionId: submission.id,
				email: `author-${submission.id.slice(0, 8)}@test.com`,
				firstName: "Test",
				lastName: "Author",
				affiliationId: affiliation.id,
				orderIndex: 1,
				isPresenter: true,
			},
		});

		await db.submission.update({
			where: { id: submission.id },
			data: { presenterId: author.id },
		});
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
			scoreNovelty: 4,
			scoreMethodology: 4,
			scoreClarity: 5,
			scoreRelevance: 4,
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

// Cleanup helper - delete submission and related data
export async function deleteSubmission(submissionId: string): Promise<void> {
	const db = getPrisma();

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
