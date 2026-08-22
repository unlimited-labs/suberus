import { test, expect } from "../helpers/base-fixtures";
import {
	createSubmission,
	getPrisma,
	getTestUserIds,
	setAppSetting,
} from "../helpers/test-db";
import {
	AssignmentStatus,
	ReviewDecision,
	SubmissionStatus,
	SubmissionType,
} from "../../src/generated/prisma/enums";

/**
 * E2E tests: reducing requiredReviewers must not leave submissions stuck.
 *
 * Bug: cancelAssignment() didn't re-check review completion. So after lowering
 * requiredReviewers and cancelling the excess reviewer, the submission stayed
 * in UNDER_REVIEW with no way to progress.
 */

// Original E2E configs (from global-setup) — restored in afterAll
const ORIGINAL_POSTER_CONFIG = {
	isActive: true,
	contentFormat: "TEXT",
	allowedExtensions: [] as string[],
	requiredReviewers: 1,
	reviewMode: "SINGLE_BLIND",
	reviewDeadlineDays: 7,
	requiresEditorDecision: false,
	enableScoring: false,
	scoringCriteria: [] as unknown[],
	enableConfidenceLevel: true,
	enableTrackSelection: false,
};

const ORIGINAL_ORAL_CONFIG = {
	isActive: true,
	contentFormat: "TEXT",
	allowedExtensions: [] as string[],
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
};

/** Create a submission at UNDER_REVIEW with N completed + M pending assignments */
async function createUnderReviewSubmission(opts: {
	testRunId: string;
	title: string;
	type: SubmissionType;
	completedCount: number;
	pendingCount: number;
	decision?: ReviewDecision;
}) {
	const db = getPrisma();
	const { adminUserId, reviewerUserId, editorUserId, testUserId } =
		await getTestUserIds();

	const { id, title } = await createSubmission({
		testRunId: opts.testRunId,
		title: opts.title,
		type: opts.type,
		status: SubmissionStatus.UNDER_REVIEW,
	});

	const reviewerPool = [reviewerUserId, editorUserId, testUserId];
	const completedIds: string[] = [];
	const pendingIds: string[] = [];

	for (let i = 0; i < opts.completedCount + opts.pendingCount; i++) {
		const isCompleted = i < opts.completedCount;
		const assignment = await db.reviewAssignment.create({
			data: {
				submissionId: id,
				reviewerId: reviewerPool[i],
				round: 1,
				status: isCompleted
					? AssignmentStatus.COMPLETED
					: AssignmentStatus.PENDING,
				deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				assignedBy: adminUserId,
				completedAt: isCompleted ? new Date() : null,
				orderIndex: i,
			},
		});

		if (isCompleted) {
			completedIds.push(assignment.id);
			await db.review.create({
				data: {
					assignmentId: assignment.id,
					submissionId: id,
					reviewerId: reviewerPool[i],
					round: 1,
					decision: opts.decision ?? ReviewDecision.ACCEPT,
					comments:
						"Good submission, meets all requirements for acceptance.",
				},
			});
		} else {
			pendingIds.push(assignment.id);
		}
	}

	return { submissionId: id, title, completedIds, pendingIds };
}

test.describe("Reviewer count change — cancel triggers completion", () => {
	test.afterAll(async () => {
		await setAppSetting("SUBMISSION_TYPE_POSTER", ORIGINAL_POSTER_CONFIG);
		await setAppSetting(
			"SUBMISSION_TYPE_ORAL_PRESENTATION",
			ORIGINAL_ORAL_CONFIG,
		);
	});

	test("cancel pending reviewer after reducing requiredReviewers → auto-accepts (requiresEditorDecision=false)", async ({
		testRun,
		cleanup,
	}) => {
		const db = getPrisma();
		const { adminUserId } = await getTestUserIds();

		// Set POSTER to requiredReviewers=2 (simulating the "before" state)
		await setAppSetting("SUBMISSION_TYPE_POSTER", {
			...ORIGINAL_POSTER_CONFIG,
			requiredReviewers: 2,
		});

		const { submissionId, pendingIds } = await createUnderReviewSubmission({
			testRunId: testRun.testRunId,
			title: "Cancel Triggers Accept",
			type: SubmissionType.POSTER,
			completedCount: 1,
			pendingCount: 1,
			decision: ReviewDecision.ACCEPT,
		});
		cleanup.track(submissionId);

		await setAppSetting("SUBMISSION_TYPE_POSTER", {
			...ORIGINAL_POSTER_CONFIG,
			requiredReviewers: 1,
		});

		// Cancel the pending reviewer — should trigger completion re-check
		const { cancelAssignment } = await import(
			"../../src/features/reviews/server/assignments"
		);
		const result = await cancelAssignment(pendingIds[0], adminUserId);
		expect(result.success).toBe(true);

		const submission = await db.submission.findUnique({
			where: { id: submissionId },
			select: { status: true },
		});
		expect(submission?.status).toBe(SubmissionStatus.ACCEPTED);
	});

	test("cancel pending reviewer with requiresEditorDecision=true → transitions to AWAITING_DECISION", async ({
		testRun,
		cleanup,
	}) => {
		const db = getPrisma();
		const { adminUserId } = await getTestUserIds();

		// ORAL_PRESENTATION already has requiredReviewers=2, requiresEditorDecision=true
		const { submissionId, pendingIds } = await createUnderReviewSubmission({
			testRunId: testRun.testRunId,
			title: "Cancel Triggers Awaiting Decision",
			type: SubmissionType.ABSTRACT,
			completedCount: 1,
			pendingCount: 1,
			decision: ReviewDecision.ACCEPT,
		});
		cleanup.track(submissionId);

		await setAppSetting("SUBMISSION_TYPE_ORAL_PRESENTATION", {
			...ORIGINAL_ORAL_CONFIG,
			requiredReviewers: 1,
		});

		const { cancelAssignment } = await import(
			"../../src/features/reviews/server/assignments"
		);
		const result = await cancelAssignment(pendingIds[0], adminUserId);
		expect(result.success).toBe(true);

		// Should transition to AWAITING_DECISION (not auto-accept, because requiresEditorDecision=true)
		const submission = await db.submission.findUnique({
			where: { id: submissionId },
			select: { status: true },
		});
		expect(submission?.status).toBe(SubmissionStatus.AWAITING_DECISION);
	});

	test("cancel pending reviewer when still not enough completed → stays UNDER_REVIEW", async ({
		testRun,
		cleanup,
	}) => {
		const db = getPrisma();
		const { adminUserId } = await getTestUserIds();

		// ORAL_PRESENTATION: requiredReviewers=2, requiresEditorDecision=true
		// Restore original config first
		await setAppSetting(
			"SUBMISSION_TYPE_ORAL_PRESENTATION",
			ORIGINAL_ORAL_CONFIG,
		);

		// Create with 3 assigned, 1 completed (need 2 completed)
		const { submissionId, pendingIds } = await createUnderReviewSubmission({
			testRunId: testRun.testRunId,
			title: "Cancel Keeps Under Review",
			type: SubmissionType.ABSTRACT,
			completedCount: 1,
			pendingCount: 2,
			decision: ReviewDecision.ACCEPT,
		});
		cleanup.track(submissionId);

		// Cancel 1 pending → 2 assigned (1 completed, 1 pending), requiredReviewers=2
		const { cancelAssignment } = await import(
			"../../src/features/reviews/server/assignments"
		);
		const result = await cancelAssignment(pendingIds[0], adminUserId);
		expect(result.success).toBe(true);

		// Should stay UNDER_REVIEW (1 completed < 2 required)
		const submission = await db.submission.findUnique({
			where: { id: submissionId },
			select: { status: true },
		});
		expect(submission?.status).toBe(SubmissionStatus.UNDER_REVIEW);
	});
});
