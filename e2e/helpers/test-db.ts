import { PrismaClient } from "../../src/generated/prisma/client";
import {
	AssignmentStatus,
	type EmailEventType,
	EditorDecisionType,
	ReviewDecision,
	SubmissionStatus,
	SubmissionType,
	UserRole,
} from "../../src/generated/prisma/enums";
import type { AppSettingKey } from "../../src/features/settings/types";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { dbUrlFor, baseUrlFor, fromAddrFor } from "../../playwright.config";
import { TEST_USER, ADMIN_USER, REVIEWER_USER, EDITOR_USER, DEFAULT_PASSWORD } from "./test-users";

// App modules dynamically imported by test helpers (e.g. storage.ts → src/env.ts)
// need env; the per-worker overrides point in-process app code at this worker's DB.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
config({ quiet: true, path: resolve(PROJECT_ROOT, ".env") });
{
	const wi = Number(process.env.TEST_PARALLEL_INDEX ?? 0);
	process.env.DATABASE_URL = dbUrlFor(wi);
	process.env.APP_BASE_URL = baseUrlFor(wi);
	process.env.SMTP_FROM_EMAIL = fromAddrFor(wi);
}

const clients = new Map<number, PrismaClient>();

export function getPrisma(
	workerIndex = Number(process.env.TEST_PARALLEL_INDEX ?? 0),
): PrismaClient {
	let client = clients.get(workerIndex);
	if (!client) {
		const adapter = new PrismaPg({ connectionString: dbUrlFor(workerIndex) });
		client = new PrismaClient({ adapter });
		clients.set(workerIndex, client);
	}
	return client;
}

export const prisma = {
	get client() {
		return getPrisma();
	},
};

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
	extraAuthors?: Array<{
		firstName: string;
		lastName: string;
		email?: string;
		affiliationName?: string;
		isPresenter?: boolean;
		userId?: string;
	}>;
	keywords?: string[];
	trackId?: string;
}

export interface SnapshotAuthor {
	firstName: string;
	lastName: string;
	email: string;
	affiliation: string;
	orderIndex: number;
	isPresenter: boolean;
}

/** Create the primary + extra authors for a submission, set the presenter, and
 *  return the snapshot used to seed version 1. No-op when withAuthor is false. */
// fallow-ignore-next-line complexity -- linear test factory, coverage-driven CRAP
async function seedSubmissionAuthors(
	submissionId: string,
	options: CreateSubmissionOptions,
): Promise<SnapshotAuthor[]> {
	if (options.withAuthor === false) return [];
	const db = getPrisma();
	const snapshot: SnapshotAuthor[] = [];

	const ad = options.authorData;
	const affiliationName = ad?.affiliationName ?? "Test University";
	const affiliation = await db.affiliation.upsert({
		where: { name: affiliationName },
		update: {},
		create: { name: affiliationName },
	});
	const primaryEmail = ad?.email ?? `author-${submissionId.slice(0, 8)}@test.com`;
	const author = await db.submissionAuthor.create({
		data: {
			submissionId,
			email: primaryEmail,
			firstName: ad?.firstName ?? "Test",
			lastName: ad?.lastName ?? "Author",
			affiliationId: affiliation.id,
			orderIndex: 1,
			isPresenter: true,
		},
	});
	snapshot.push({
		firstName: author.firstName,
		lastName: author.lastName,
		email: primaryEmail,
		affiliation: affiliationName,
		orderIndex: 1,
		isPresenter: true,
	});
	await db.submission.update({
		where: { id: submissionId },
		data: { presenterId: author.id },
	});

	for (const [i, extra] of (options.extraAuthors ?? []).entries()) {
		const extraAffName = extra.affiliationName ?? "Test University";
		const extraAff = await db.affiliation.upsert({
			where: { name: extraAffName },
			update: {},
			create: { name: extraAffName },
		});
		const extraEmail =
			extra.email ?? `extra-author-${i}-${submissionId.slice(0, 8)}@test.com`;
		await db.submissionAuthor.create({
			data: {
				submissionId,
				email: extraEmail,
				firstName: extra.firstName,
				lastName: extra.lastName,
				affiliationId: extraAff.id,
				orderIndex: i + 2,
				isPresenter: extra.isPresenter ?? false,
				userId: extra.userId ?? null,
			},
		});
		snapshot.push({
			firstName: extra.firstName,
			lastName: extra.lastName,
			email: extraEmail,
			affiliation: extraAffName,
			orderIndex: i + 2,
			isPresenter: extra.isPresenter ?? false,
		});
	}
	return snapshot;
}

async function seedSubmissionKeywords(
	submissionId: string,
	keywords: string[] | undefined,
): Promise<void> {
	if (!keywords?.length) return;
	const db = getPrisma();
	for (const keyword of keywords) {
		const kw = await db.keyword.upsert({
			where: { name: keyword },
			update: {},
			create: { name: keyword },
		});
		await db.submissionKeyword.create({
			data: { submissionId, keywordId: kw.id },
		});
	}
}

/** Seed version 1 with the frozen author/keyword snapshot and point
 *  currentVersionId at it — mirrors real createNewSubmission so a single resubmit
 *  produces version 2. addSubmissionVersions replaces this for custom histories. */
async function seedInitialVersion(
	submissionId: string,
	title: string,
	content: string,
	snapshotAuthors: SnapshotAuthor[],
	keywords: string[] | undefined,
): Promise<void> {
	const db = getPrisma();
	const version = await db.submissionVersion.create({
		data: {
			submissionId,
			version: 1,
			title,
			content,
			authorsSnapshot: snapshotAuthors.length
				? { create: snapshotAuthors }
				: undefined,
			keywordsSnapshot: keywords?.length
				? { create: keywords.map((name) => ({ name })) }
				: undefined,
		},
	});
	await db.submission.update({
		where: { id: submissionId },
		data: { currentVersionId: version.id },
	});
}

export async function createSubmission(options: CreateSubmissionOptions): Promise<{
	id: string;
	title: string;
	status: SubmissionStatus;
}> {
	const db = getPrisma();
	const { testUserId } = await getTestUserIds();

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
			trackId: options.trackId ?? null,
		},
	});

	const snapshotAuthors = await seedSubmissionAuthors(submission.id, options);
	await seedSubmissionKeywords(submission.id, options.keywords);
	await seedInitialVersion(
		submission.id,
		prefixedTitle,
		submission.content,
		snapshotAuthors,
		options.keywords,
	);

	if (options.status && options.status !== SubmissionStatus.DRAFT) {
		await db.activityLog.create({
			data: {
				type: "SUBMISSION_STATUS_CHANGED",
				submissionId: submission.id,
				detail: {
					type: "SUBMISSION_STATUS_CHANGED",
					fromStatus: SubmissionStatus.DRAFT,
					toStatus: options.status,
					round: 1,
					event: "SUBMIT",
					reason: "Test submission",
				},
			},
		});
	}

	return {
		id: submission.id,
		title: submission.title,
		status: submission.status,
	};
}

/**
 * Replace a submission's version history with the given list (numbered from 1)
 * and point `currentVersionId` at the last one. `createSubmission` now seeds a
 * version 1, so this first clears existing versions to avoid a unique-version
 * collision and to give the test full control over the history it asserts on.
 * Does not touch `currentRound` (keeps it consistent with any assignment).
 */
export async function addSubmissionVersions(
	submissionId: string,
	versions: Array<{
		title: string;
		content: string;
		comment?: string;
		authors?: SnapshotAuthor[];
		keywords?: string[];
		/**
		 * Attach a synthetic File row to this version (FILE-format submissions).
		 * No bytes are uploaded — callers that exercise the file-change notice only
		 * read the file id, so this stays free of S3/sidecar dependencies.
		 */
		file?: { fileName: string; mimeType?: string };
	}>,
): Promise<string[]> {
	const db = getPrisma();
	const { testUserId } = await getTestUserIds();
	await db.submission.update({
		where: { id: submissionId },
		data: { currentVersionId: null },
	});
	await db.submissionVersion.deleteMany({ where: { submissionId } });
	const ids: string[] = [];
	let lastId: string | null = null;
	for (let i = 0; i < versions.length; i++) {
		const v = versions[i];
		let fileId: string | undefined;
		if (v.file) {
			const file = await db.file.create({
				data: {
					entityType: "SUBMISSION_VERSION",
					entityId: submissionId,
					type: "SUBMISSION_MAIN",
					storageKey: `e2e/${submissionId}/v${i + 1}/${v.file.fileName}`,
					fileName: v.file.fileName,
					originalName: v.file.fileName,
					mimeType: v.file.mimeType ?? "application/pdf",
					size: 1,
					uploadedById: testUserId,
				},
			});
			fileId = file.id;
		}
		const row = await db.submissionVersion.create({
			data: {
				submissionId,
				version: i + 1,
				title: v.title,
				content: v.content,
				comment: v.comment ?? null,
				fileId,
				authorsSnapshot: v.authors?.length
					? { create: v.authors }
					: undefined,
				keywordsSnapshot: v.keywords?.length
					? { create: v.keywords.map((name) => ({ name })) }
					: undefined,
			},
		});
		ids.push(row.id);
		lastId = row.id;
	}
	if (lastId) {
		await db.submission.update({
			where: { id: submissionId },
			data: { currentVersionId: lastId },
		});
	}
	return ids;
}

/**
 * Replace a submission's history with file-backed PDF versions and synchronously
 * normalize each, so the lazy file redline is ready the moment the Compare page
 * opens. Normalizing inline (not via the pg-boss worker) keeps the test
 * deterministic — no polling for an async job. Requires the pdf-api + docx-api
 * sidecars to be up (the caller should skip the test when they are not).
 */
export async function seedNormalizedPdfVersions(
	submissionId: string,
	versions: Array<{
		fixturePath: string;
		fileName: string;
		title: string;
		content: string;
	}>,
): Promise<string[]> {
	const fs = await import("fs");
	const path = await import("path");
	const db = getPrisma();
	const { testUserId } = await getTestUserIds();
	const { uploadFile, generateSubmissionFileKey } = await import(
		"../../src/shared/server/storage"
	);
	const { normalizeSubmissionFile } = await import(
		"../../src/features/submission-diff/server/normalize-version"
	);

	await db.submission.update({
		where: { id: submissionId },
		data: { currentVersionId: null },
	});
	await db.submissionVersion.deleteMany({ where: { submissionId } });

	const ids: string[] = [];
	let lastId: string | null = null;
	for (let i = 0; i < versions.length; i++) {
		const v = versions[i];
		const buf = fs.readFileSync(path.resolve(v.fixturePath));
		const storageKey = generateSubmissionFileKey(submissionId, i + 1, v.fileName);
		await uploadFile(buf, storageKey, "application/pdf");
		const file = await db.file.create({
			data: {
				entityType: "SUBMISSION_VERSION",
				entityId: submissionId,
				type: "SUBMISSION_MAIN",
				storageKey,
				fileName: v.fileName,
				originalName: v.fileName,
				mimeType: "application/pdf",
				size: buf.length,
				uploadedById: testUserId,
			},
		});
		const row = await db.submissionVersion.create({
			data: {
				submissionId,
				version: i + 1,
				title: v.title,
				content: v.content,
				fileId: file.id,
			},
		});
		ids.push(row.id);
		lastId = row.id;
		await normalizeSubmissionFile({
			storageKey,
			fileName: v.fileName,
			fileId: file.id,
		});
	}
	if (lastId) {
		await db.submission.update({
			where: { id: submissionId },
			data: { currentVersionId: lastId },
		});
	}
	return ids;
}

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
			deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			assignedBy: adminUserId,
			orderIndex: 0,
		},
	});

	await db.activityLog.create({
		data: {
			type: "SUBMISSION_STATUS_CHANGED",
			submissionId: submission.id,
			detail: {
				type: "SUBMISSION_STATUS_CHANGED",
				fromStatus: SubmissionStatus.SUBMITTED,
				toStatus: SubmissionStatus.UNDER_REVIEW,
				round: 1,
				event: "ASSIGN_REVIEWER",
				reason: "Reviewer assigned",
			},
		},
	});

	return {
		submissionId: submission.id,
		assignmentId: assignment.id,
		title: submission.title,
	};
}

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

	const submission = await createSubmission({
		...options,
		status: SubmissionStatus.AWAITING_DECISION,
	});

	const reviewerId = options.reviewerId ?? reviewerUserId;

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

	await db.activityLog.create({
		data: {
			type: "SUBMISSION_STATUS_CHANGED",
			submissionId: submission.id,
			detail: {
				type: "SUBMISSION_STATUS_CHANGED",
				fromStatus: SubmissionStatus.UNDER_REVIEW,
				toStatus: SubmissionStatus.AWAITING_DECISION,
				round: 1,
				event: "COMPLETE_REVIEWS",
				reason: "All reviews completed",
			},
		},
	});

	return {
		submissionId: submission.id,
		assignmentId: assignment.id,
		reviewId: review.id,
		title: submission.title,
	};
}

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

	const { submissionId, title } = await createSubmissionWithReview({
		...options,
	});

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

	await db.submission.update({
		where: { id: submissionId },
		data: { status: targetStatus },
	});

	await db.activityLog.create({
		data: {
			type: "SUBMISSION_STATUS_CHANGED",
			submissionId,
			detail: {
				type: "SUBMISSION_STATUS_CHANGED",
				fromStatus: SubmissionStatus.AWAITING_DECISION,
				toStatus: targetStatus,
				round: 1,
				event: "EDITOR_DECISION",
				reason: `Editor decision: ${decision}`,
			},
		},
	});

	return { submissionId, title };
}

export async function deleteSubmission(submissionId: string): Promise<void> {
	const db = getPrisma();

	const assignments = await db.reviewAssignment.findMany({
		where: { submissionId },
		select: { id: true },
	});
	for (const a of assignments) {
		await db.sentReminder.deleteMany({ where: { entityId: a.id } });
	}
	await db.sentReminder.deleteMany({ where: { entityId: submissionId } });

	const reviews = await db.review.findMany({
		where: { submissionId },
		select: { id: true },
	});
	if (reviews.length > 0) {
		const reviewIds = reviews.map((r) => r.id);
		const reviewFiles = await db.file.findMany({
			where: { entityType: "REVIEW", entityId: { in: reviewIds } },
			select: { id: true, storageKey: true },
		});
		if (reviewFiles.length > 0) {
			const { deleteFile } = await import("../../src/shared/server/storage");
			for (const f of reviewFiles) {
				await deleteFile(f.storageKey).catch(() => {});
			}
			await db.file.deleteMany({ where: { id: { in: reviewFiles.map((f) => f.id) } } });
		}
	}

	// Delete in order respecting FK constraints
	await db.review.deleteMany({ where: { submissionId } });
	await db.reviewAssignment.deleteMany({ where: { submissionId } });
	await db.editorDecision.deleteMany({ where: { submissionId } });
	await db.activityLog.deleteMany({ where: { submissionId } });
	await db.submissionKeyword.deleteMany({ where: { submissionId } });
	await db.submission.update({
		where: { id: submissionId },
		data: { presenterId: null, currentVersionId: null },
	});
	await db.submissionAuthor.deleteMany({ where: { submissionId } });

	// Query by entityId directly — catches orphaned files not linked to any version
	const allFiles = await db.file.findMany({
		where: { entityId: submissionId },
		select: { id: true, storageKey: true },
	});
	if (allFiles.length > 0) {
		const { deleteFile } = await import("../../src/shared/server/storage");
		for (const f of allFiles) {
			await deleteFile(f.storageKey).catch(() => {});
		}
		await db.submissionVersion.updateMany({
			where: { submissionId },
			data: { fileId: null },
		});
		await db.file.deleteMany({ where: { id: { in: allFiles.map((f) => f.id) } } });
	}

	await db.submissionVersion.deleteMany({ where: { submissionId } });
	await db.submission.delete({ where: { id: submissionId } });
}

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

export async function getAssignmentStatus(assignmentId: string): Promise<AssignmentStatus | null> {
	const db = getPrisma();
	const assignment = await db.reviewAssignment.findUnique({
		where: { id: assignmentId },
		select: { status: true },
	});
	return assignment?.status ?? null;
}

// NOTE: Creating a fee = payment received (admin assigns fee after payment)
export interface CreateFeeOptions {
	userId: string;
	type?: string;
	amount?: number;
	currency?: string;
	paidAt?: Date;
}

export async function createFee(options: CreateFeeOptions): Promise<{ id: string }> {
	const db = getPrisma();

	const fee = await db.fee.create({
		data: {
			userId: options.userId,
			type: options.type ?? "Full Conference Fee",
			amount: options.amount ?? 150.0,
			currency: options.currency ?? "EUR",
			paid: true, // Fee existence = payment received
			paidAt: options.paidAt ?? new Date(),
		},
	});

	return { id: fee.id };
}

export async function deleteFee(userId: string): Promise<void> {
	const db = getPrisma();
	await db.fee.deleteMany({ where: { userId } });
}

export interface CreateTestUserOptions {
	email: string;
	password?: string;
	firstName?: string;
	lastName?: string;
	affiliationName?: string;
	emailVerified?: boolean;
	role?: UserRole;
	contactConsent?: boolean;
}

export async function createTestUser(
	options: CreateTestUserOptions
): Promise<{ id: string; email: string; affiliationId: string }> {
	const db = getPrisma();

	// Create unique affiliation (avoid conflicts in parallel tests)
	const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	const affiliationName = options.affiliationName || `E2E Test Affiliation ${uniqueId}`;
	const affiliation = await db.affiliation.create({
		data: { name: affiliationName },
	});

	// Use Better Auth signup (handles password hashing and account creation)
	const { auth } = await import("../../src/features/auth/server/auth.server");
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

	await db.user.update({
		where: { id: result.user.id },
		data: {
			emailVerified: options.emailVerified ?? true,
			isActive: true,
			role: options.role || UserRole.AUTHOR,
			affiliationId: affiliation.id,
			contactConsent: options.contactConsent ?? false,
		},
	});

	return { id: result.user.id, email: options.email, affiliationId: affiliation.id };
}

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

	const submissions = await db.submission.findMany({
		where: { userId },
		select: { id: true },
	});

	for (const sub of submissions) {
		await deleteSubmission(sub.id);
	}

	await db.user.delete({ where: { id: userId } });
}

export interface CreateSubmissionWithFileOptions extends CreateSubmissionOptions {
	fixturePath?: string;
	fileName?: string;
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

	const submission = await createSubmission({
		...options,
		type: options.type ?? SubmissionType.FULL_PAPER,
	});

	const fixturePath = options.fixturePath ?? "e2e/submissions/fixtures/document.pdf";
	const absolutePath = path.resolve(fixturePath);
	const fileBuffer = fs.readFileSync(absolutePath);
	const fileName = options.fileName ?? path.basename(absolutePath);
	const mimeType = options.mimeType ?? "application/pdf";

	const { uploadFile, generateSubmissionFileKey } = await import("../../src/shared/server/storage");
	const storageKey = generateSubmissionFileKey(submission.id, 1, fileName);
	await uploadFile(Buffer.from(fileBuffer), storageKey, mimeType);

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

	// Attach the file to the version createSubmission already seeded (and which
	// currentVersionId already points at), rather than creating a second v1.
	const version = await db.submissionVersion.findFirstOrThrow({
		where: { submissionId: submission.id, version: 1 },
	});
	await db.submissionVersion.update({
		where: { id: version.id },
		data: { fileId: file.id },
	});

	return {
		id: submission.id,
		title: submission.title,
		fileId: file.id,
		versionId: version.id,
		storageKey,
	};
}

export async function createTrack(
	testRunId: string,
	name: string,
	supervisorId?: string,
	isActive = true,
): Promise<string> {
	const db = getPrisma();
	const track = await db.conferenceTrack.create({
		data: {
			name: `${testRunId}_${name}`,
			supervisorId: supervisorId || null,
			isActive,
		},
	});
	return track.id;
}

export async function deleteTrack(trackId: string): Promise<void> {
	const db = getPrisma();
	await db.conferenceTrack.delete({ where: { id: trackId } });
}

export async function setUserLateSubmission(
	userId: string,
	allow: boolean,
): Promise<void> {
	const db = getPrisma();
	await db.user.update({
		where: { id: userId },
		data: { allowLateSubmission: allow },
	});
}

export async function setAppSetting(key: AppSettingKey, value: unknown): Promise<void> {
	const db = getPrisma();
	await db.appSetting.upsert({
		where: { key },
		update: { value: value as object },
		create: { key, value: value as object },
	});
}

/**
 * Snapshot the current values of the given app settings and return a `restore`
 * closure for `afterAll` cleanup: keys absent at snapshot time are deleted, the
 * rest are upserted back to their original value.
 */
export async function snapshotAppSettings(
	keys: readonly AppSettingKey[],
): Promise<{ restore: () => Promise<void> }> {
	const db = getPrisma();
	const original = new Map<AppSettingKey, unknown>();
	for (const key of keys) {
		const setting = await db.appSetting.findUnique({ where: { key } });
		original.set(key, setting?.value ?? null);
	}
	return {
		async restore() {
			const restoreDb = getPrisma();
			for (const [key, value] of original) {
				if (value === null) {
					await restoreDb.appSetting.deleteMany({ where: { key } });
				} else {
					await restoreDb.appSetting.upsert({
						where: { key },
						update: { value: value as object },
						create: { key, value: value as object },
					});
				}
			}
		},
	};
}

/**
 * Override the Full Paper type's accepted file extensions (default seed is
 * DOCX-only since the single-extension change). Extraction tests need PDF too,
 * to exercise the slower PDF pipeline. Returns a `restore` for afterAll.
 */
export async function setFullPaperAllowedExtensions(
	extensions: readonly string[],
): Promise<{ restore: () => Promise<void> }> {
	const db = getPrisma();
	const snap = await snapshotAppSettings(["SUBMISSION_TYPE_FULL_PAPER"]);
	const existing = await db.appSetting.findUnique({
		where: { key: "SUBMISSION_TYPE_FULL_PAPER" },
	});
	const cfg = (existing?.value ?? {}) as Record<string, unknown>;
	await setAppSetting("SUBMISSION_TYPE_FULL_PAPER", {
		...cfg,
		allowedExtensions: extensions,
	});
	return snap;
}

export async function cleanupSentReminders(entityId: string): Promise<void> {
	const db = getPrisma();
	await db.sentReminder.deleteMany({ where: { entityId } });
}

/** Count sent reminders for an entity (scopes assertions to one submission) */
export async function countSentReminders(
	entityId: string,
	reminderType?: EmailEventType,
): Promise<number> {
	const db = getPrisma();
	return db.sentReminder.count({
		where: { entityId, ...(reminderType && { reminderType }) },
	});
}

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

export async function createSurveyQuestion(
	label: string,
	orderIndex: number,
	type?: string,
	options?: string[],
	isRequired?: boolean,
): Promise<{ id: string }> {
	const db = getPrisma();
	return db.surveyQuestion.create({
		data: {
			label,
			orderIndex,
			isActive: true,
			...(type && { type: type as "CHECKBOX" | "TEXT" | "SINGLE_SELECT" | "MULTI_SELECT" }),
			...(options && { options }),
			...(isRequired !== undefined && { isRequired }),
		},
	});
}

export async function deleteSurveyQuestion(questionId: string): Promise<void> {
	const db = getPrisma();
	await db.surveyAnswer.deleteMany({ where: { questionId } });
	await db.surveyQuestion.delete({ where: { id: questionId } }).catch(() => {});
}

export async function getUserSurveyAnswers(userId: string) {
	const db = getPrisma();
	return db.surveyAnswer.findMany({
		where: { userId },
		include: { question: true },
	});
}

export async function deleteUserSurveyAnswers(userId: string): Promise<void> {
	const db = getPrisma();
	await db.surveyAnswer.deleteMany({ where: { userId } });
}

/**
 * Re-assert the survey questions the global seed creates (keep in sync with
 * `e2e/setup/seed.ts`). The seeded questions are GLOBAL rows shared by every
 * project on a worker DB; a sibling spec can leave one missing/inactive, which
 * silently drops it from the profile survey. Idempotent: creates what's gone,
 * reactivates what's off — so survey-dependent specs start from a known state.
 * Also re-answers the required SINGLE_SELECT for `userId` (when given) so the
 * profile form's required-gate passes; admin list specs can omit it.
 */
export async function ensureSeededSurveyQuestions(
	userId?: string,
): Promise<void> {
	const db = getPrisma();
	const seeded: Array<{
		label: string;
		orderIndex: number;
		type: "CHECKBOX" | "TEXT" | "SINGLE_SELECT" | "MULTI_SELECT";
		isRequired?: boolean;
		allowOther?: boolean;
		options?: string[];
	}> = [
		{
			label: "Please send me an Invitation Letter for a Visa Application.",
			orderIndex: 0,
			type: "CHECKBOX",
		},
		{ label: "I need a certificate of attendance.", orderIndex: 1, type: "CHECKBOX" },
		{ label: "Dietary requirements", orderIndex: 2, type: "TEXT" },
		{
			label: "Preferred session format",
			orderIndex: 3,
			type: "SINGLE_SELECT",
			isRequired: true,
			allowOther: true,
			options: ["Oral", "Poster", "Workshop"],
		},
		{
			label: "Which days will you attend?",
			orderIndex: 4,
			type: "MULTI_SELECT",
			allowOther: true,
			options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
		},
	];

	let requiredQuestionId: string | null = null;
	for (const q of seeded) {
		const existing = await db.surveyQuestion.findFirst({
			where: { label: q.label },
		});
		const id =
			existing?.id ??
			(
				await db.surveyQuestion.create({
					data: {
						label: q.label,
						orderIndex: q.orderIndex,
						type: q.type,
						isActive: true,
						isRequired: q.isRequired ?? false,
						allowOther: q.allowOther ?? false,
						...(q.options && { options: q.options }),
					},
				})
			).id;
		if (existing && !existing.isActive) {
			await db.surveyQuestion.update({
				where: { id },
				data: { isActive: true },
			});
		}
		if (q.isRequired) requiredQuestionId = id;
	}

	// Seed pre-answers the required question for the test user so the profile
	// survey's required-gate is satisfied on load.
	if (requiredQuestionId && userId) {
		const answered = await db.surveyAnswer.findFirst({
			where: { userId, questionId: requiredQuestionId },
		});
		if (!answered) {
			await db.surveyAnswer.create({
				data: { userId, questionId: requiredQuestionId, value: "Poster" },
			});
		}
	}
}

/** Create a Room (prefixed by testRunId for isolation) */
export async function createRoom(
	testRunId: string,
	name: string,
	opts?: { description?: string; link?: string; order?: number },
): Promise<string> {
	const db = getPrisma();
	const room = await db.room.create({
		data: {
			name: `${testRunId}_${name}`,
			description: opts?.description ?? null,
			link: opts?.link ?? null,
			order: opts?.order ?? 0,
		},
	});
	return room.id;
}

export async function deleteRoom(roomId: string): Promise<void> {
	const db = getPrisma();
	await db.room.delete({ where: { id: roomId } }).catch(() => {});
}

/** Create a ProgramTrack (prefixed by testRunId) */
export async function createProgramTrack(
	testRunId: string,
	name: string,
	opts?: { color?: string; series?: string; seriesOrder?: number },
): Promise<string> {
	const db = getPrisma();
	const track = await db.programTrack.create({
		data: {
			name: `${testRunId}_${name}`,
			color: opts?.color ?? null,
			series: opts?.series ?? null,
			seriesOrder: opts?.seriesOrder ?? null,
		},
	});
	return track.id;
}

export async function deleteProgramTrack(trackId: string): Promise<void> {
	const db = getPrisma();
	await db.programTrack.delete({ where: { id: trackId } }).catch(() => {});
}

export interface CreateProgramSessionOptions {
	testRunId: string;
	title: string;
	startAt: Date;
	endAt: Date;
	roomId?: string;
	trackId?: string;
	chairUserIds?: string[];
	untimedSlots?: boolean;
}

export async function createProgramSession(
	opts: CreateProgramSessionOptions,
): Promise<string> {
	const db = getPrisma();
	const session = await db.programSession.create({
		data: {
			title: `${opts.testRunId}_${opts.title}`,
			startAt: opts.startAt,
			endAt: opts.endAt,
			roomId: opts.roomId ?? null,
			trackId: opts.trackId ?? null,
			untimedSlots: opts.untimedSlots ?? false,
			chairs: opts.chairUserIds?.length
				? {
						create: opts.chairUserIds.map((userId) => ({ userId })),
					}
				: undefined,
		},
	});
	return session.id;
}

export async function deleteProgramSession(sessionId: string): Promise<void> {
	const db = getPrisma();
	// Slots cascade with the session; their INVITED placeholders would not.
	const invited = await db.presentationSlot.findMany({
		where: { sessionId, submission: { type: "INVITED" } },
		select: { submissionId: true },
	});
	await db.programSession.delete({ where: { id: sessionId } }).catch(() => {});
	await db.submission
		.deleteMany({ where: { id: { in: invited.map((p) => p.submissionId) } } })
		.catch(() => {});
}

export async function addPresentationToSession(
	sessionId: string,
	submissionId: string,
	opts?: { order?: number; durationMin?: number },
): Promise<string> {
	const db = getPrisma();
	const order =
		opts?.order ??
		(await db.presentationSlot.count({ where: { sessionId } }));
	const slot = await db.presentationSlot.create({
		data: {
			sessionId,
			submissionId,
			order,
			durationMin: opts?.durationMin ?? 15,
		},
	});
	return slot.id;
}

export async function createScheduleBreak(
	testRunId: string,
	opts: {
		title: string;
		startAt: Date;
		endAt: Date;
		roomId?: string;
		kind?: "BREAK" | "EVENT";
		description?: string;
		location?: string;
		locationUrl?: string;
	},
): Promise<string> {
	const db = getPrisma();
	const br = await db.scheduleBreak.create({
		data: {
			title: `${testRunId}_${opts.title}`,
			kind: opts.kind ?? "BREAK",
			description: opts.description ?? null,
			location: opts.location ?? null,
			locationUrl: opts.locationUrl ?? null,
			startAt: opts.startAt,
			endAt: opts.endAt,
			roomId: opts.roomId ?? null,
		},
	});
	return br.id;
}

export async function deleteScheduleBreak(breakId: string): Promise<void> {
	const db = getPrisma();
	await db.scheduleBreak.delete({ where: { id: breakId } }).catch(() => {});
}

export async function setConferenceTimezone(tz: string): Promise<void> {
	await setAppSetting("CONFERENCE_TIMEZONE", tz);
}

/** Set conference dates (ISO strings). Use to keep sessions in-bounds. */
export async function setConferenceDates(
	startIso: string,
	endIso: string,
): Promise<void> {
	await setAppSetting("CONFERENCE_DATE_START", startIso);
	await setAppSetting("CONFERENCE_DATE_END", endIso);
}

export async function setDailyBusinessHours(
	dayStart: string,
	dayEnd: string,
): Promise<void> {
	await setAppSetting("CONFERENCE_DAY_START", dayStart);
	await setAppSetting("CONFERENCE_DAY_END", dayEnd);
}

/** Toggle schedule published state directly (bypasses UI) */
export async function setSchedulePublished(
	published: boolean,
	userId?: string,
): Promise<void> {
	if (published) {
		await setAppSetting("SCHEDULE_STATE", {
			status: "PUBLISHED",
			publishedAt: new Date().toISOString(),
			publishedBy: userId ?? null,
		});
	} else {
		await setAppSetting("SCHEDULE_STATE", { status: "DRAFT" });
	}
}

/** Remove every planner row created for a test run (by name prefix) */
export async function cleanupPlannerForRun(testRunId: string): Promise<void> {
	const db = getPrisma();
	const prefix = `${testRunId}_`;

	const sessions = await db.programSession.findMany({
		where: { title: { startsWith: prefix } },
		select: { id: true },
	});
	for (const s of sessions) await deleteProgramSession(s.id);

	await db.scheduleBreak.deleteMany({
		where: { title: { startsWith: prefix } },
	});
	await db.programTrack.deleteMany({
		where: { name: { startsWith: prefix } },
	});
	await db.room.deleteMany({ where: { name: { startsWith: prefix } } });
}

export async function createActivityLog(opts: {
	type: string;
	submissionId: string;
	detail: Record<string, unknown>;
	performedBy?: string;
	userId?: string;
	createdAt?: Date;
}): Promise<{ id: string }> {
	const db = getPrisma();
	return db.activityLog.create({
		data: {
			type: opts.type as never,
			submissionId: opts.submissionId,
			detail: opts.detail as object,
			performedBy: opts.performedBy ?? null,
			userId: opts.userId ?? null,
			...(opts.createdAt && { createdAt: opts.createdAt }),
		},
	});
}
