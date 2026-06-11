import { test, expect } from "../helpers/base-fixtures";
import {
	createSubmission,
	createSubmissionWithAssignment,
	getPrisma,
	getTestUserIds,
} from "../helpers/test-db";
import {
	AssignmentStatus,
	ReviewDecision,
	SubmissionStatus,
	SubmissionType,
} from "../../src/generated/prisma/enums";
import { ADMIN_USER, REVIEWER_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";
import {
	expectActionAvailable,
	runSubmissionAction,
} from "../helpers/submission-actions";

/**
 * E2E tests for auto-transition after reviews and editor decision from REVIEWS_COMPLETE.
 *
 * Scenarios:
 * 1. Reviewer completes review on POSTER (requiresEditorDecision=false) → auto-transitions to terminal state
 * 2. Editor sees Make Decision from REVIEWS_COMPLETE (requiresEditorDecision=true)
 * 3. Editor makes decision directly from REVIEWS_COMPLETE
 */

/**
 * Seed submission at REVIEWS_COMPLETE with 2 completed reviews.
 * Uses ABSTRACT type → ORAL_PRESENTATION config (requiredReviewers=2, requiresEditorDecision=true).
 */
async function createSubmissionAtReviewsComplete(
	testRunId: string,
	title: string,
) {
	const db = getPrisma();
	const { adminUserId, reviewerUserId, editorUserId } =
		await getTestUserIds();

	const { id, title: prefixedTitle } = await createSubmission({
		testRunId,
		title,
		type: SubmissionType.ABSTRACT,
		status: SubmissionStatus.REVIEWS_COMPLETE,
	});

	// Add 2 completed assignments with different reviewers (unique constraint on submissionId+reviewerId+round)
	const reviewerIds = [reviewerUserId, editorUserId];
	for (let i = 0; i < 2; i++) {
		const assignment = await db.reviewAssignment.create({
			data: {
				submissionId: id,
				reviewerId: reviewerIds[i],
				round: 1,
				status: AssignmentStatus.COMPLETED,
				deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				assignedBy: adminUserId,
				completedAt: new Date(),
				orderIndex: i,
			},
		});
		await db.review.create({
			data: {
				assignmentId: assignment.id,
				submissionId: id,
				reviewerId: reviewerIds[i],
				round: 1,
				decision: ReviewDecision.ACCEPT,
				comments: "Good submission, meets all requirements.",
			},
		});
	}

	await db.activityLog.create({
		data: {
			type: "SUBMISSION_STATUS_CHANGED",
			submissionId: id,
			detail: {
				type: "SUBMISSION_STATUS_CHANGED",
				fromStatus: SubmissionStatus.UNDER_REVIEW,
				toStatus: SubmissionStatus.REVIEWS_COMPLETE,
				round: 1,
				event: "ALL_REVIEWS_COMPLETE",
				reason: "All reviews completed",
			},
		},
	});

	return { id, title: prefixedTitle };
}

test.describe("Auto-transition After Reviews", () => {
	test("reviewer completes review on poster → submission auto-transitions to accepted", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow();

		// Arrange - POSTER: requiredReviewers=1, requiresEditorDecision=false
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Auto-Transition Poster",
			type: SubmissionType.POSTER,
		});
		cleanup.track(submissionId);

		// Act - Reviewer submits Accept review
		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto("/reviews");

		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });

		// Wait for form to fully load
		await expect(
			page.getByRole("heading", { name: "Decision", exact: true }),
		).toBeVisible({ timeout: 10000 });

		// Select Accept decision
		await page
			.getByRole("button", { name: /Accept Recommends accepting/i })
			.click();

		// Fill evaluation scores (4 criteria + confidence = all score "4" buttons)
		const scoreButtons = await page
			.getByRole("button", { name: "4", exact: true })
			.all();
		for (const btn of scoreButtons) {
			await btn.click();
		}

		// Fill comments (min 50 chars)
		const commentsField = page.getByRole("textbox", {
			name: "Review Comments",
		});
		await commentsField.click();
		await commentsField.pressSequentially(
			"This poster presents solid work with clear methodology and meaningful results.",
			{ delay: 5 },
		);

		await expect(
			page.getByRole("button", { name: "Submit Review" }),
		).toBeEnabled({ timeout: 10000 });
		await page.getByRole("button", { name: "Submit Review" }).click();
		await page.waitForURL("/reviews", { timeout: 15000 });

		// Assert - Submission auto-transitioned to ACCEPTED (not stuck at UNDER_REVIEW)
		const db = getPrisma();
		const submission = await db.submission.findUnique({
			where: { id: submissionId },
			select: { status: true },
		});
		expect(submission?.status).toBe(SubmissionStatus.ACCEPTED);

		// Also verify via admin UI
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(
			page.locator('[data-testid="submission-status"]'),
		).toHaveText(/Accepted/i, { timeout: 10000 });
	});
});

test.describe("Editor Decision from REVIEWS_COMPLETE", () => {
	test("Make Decision button visible from REVIEWS_COMPLETE when requiresEditorDecision=true", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange - ABSTRACT at REVIEWS_COMPLETE (requiresEditorDecision=true)
		const { id } = await createSubmissionAtReviewsComplete(
			testRun.testRunId,
			"Make Decision Button Test",
		);
		cleanup.track(id);

		// Act
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${id}`);
		await expect(
			page.locator('[data-testid="submission-status"]'),
		).toBeVisible({ timeout: 10000 });

		// Assert - both actions available (Make Decision lives in the Actions menu,
		// Ready for Decision is the contextual primary button)
		await expectActionAvailable(page, "Make Decision");
		await expectActionAvailable(page, "Ready for Decision");
	});

	test("editor accepts submission directly from REVIEWS_COMPLETE", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { id } = await createSubmissionAtReviewsComplete(
			testRun.testRunId,
			"Direct Decision Accept",
		);
		cleanup.track(id);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${id}`);
		await expect(
			page.locator('[data-testid="submission-status"]'),
		).toBeVisible({ timeout: 10000 });

		// Act - Make decision directly (skip AWAITING_DECISION step)
		await runSubmissionAction(page, "Make Decision");
		await page.getByRole("dialog").waitFor({ state: "visible" });

		await page
			.getByRole("button", { name: /Accept.*publication/i })
			.click();
		await page
			.getByLabel(/Internal Reasoning/i)
			.fill("Strong work, accepted.");
		await page
			.getByLabel(/Letter to Author/i)
			.fill("Congratulations!");
		await page.getByRole("button", { name: "Submit Decision" }).click();

		await Promise.race([
			page
				.getByRole("dialog")
				.waitFor({ state: "hidden", timeout: 15000 }),
			page
				.locator("[data-sonner-toast]")
				.waitFor({ state: "visible", timeout: 15000 }),
		]);

		// Assert
		await page.reload();
		await expect(
			page.locator('[data-testid="submission-status"]'),
		).toHaveText(/Accepted/i, { timeout: 10000 });
	});

	test("editor rejects submission directly from REVIEWS_COMPLETE", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { id } = await createSubmissionAtReviewsComplete(
			testRun.testRunId,
			"Direct Decision Reject",
		);
		cleanup.track(id);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${id}`);
		await expect(
			page.locator('[data-testid="submission-status"]'),
		).toBeVisible({ timeout: 10000 });

		// Act - Reject directly from REVIEWS_COMPLETE
		await runSubmissionAction(page, "Make Decision");
		await page.getByRole("dialog").waitFor({ state: "visible" });

		await page
			.getByRole("button", { name: /Reject.*not meet/i })
			.click();
		await page
			.getByLabel(/Internal Reasoning/i)
			.fill("Does not meet standards.");
		await page
			.getByLabel(/Letter to Author/i)
			.fill("We regret to inform you.");
		await page.getByRole("button", { name: "Submit Decision" }).click();

		await Promise.race([
			page
				.getByRole("dialog")
				.waitFor({ state: "hidden", timeout: 15000 }),
			page
				.locator("[data-sonner-toast]")
				.waitFor({ state: "visible", timeout: 15000 }),
		]);

		// Assert
		await page.reload();
		await expect(
			page.locator('[data-testid="submission-status"]'),
		).toHaveText(/Rejected/i, { timeout: 10000 });
	});
});

test.describe("Auto-transition config edge cases", () => {
	test("requiresEditorDecision=true auto-advances to AWAITING_DECISION", async ({
		testRun,
		cleanup,
	}) => {
		const db = getPrisma();
		const { adminUserId, reviewerUserId, editorUserId } =
			await getTestUserIds();

		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Auto AWAITING_DECISION Test",
			type: SubmissionType.ABSTRACT,
			status: SubmissionStatus.UNDER_REVIEW,
		});
		cleanup.track(id);

		// Create 2 completed assignments (requiredReviewers=2 for ORAL_PRESENTATION)
		const reviewerIds = [reviewerUserId, editorUserId];
		for (let i = 0; i < 2; i++) {
			const assignment = await db.reviewAssignment.create({
				data: {
					submissionId: id,
					reviewerId: reviewerIds[i],
					round: 1,
					status: AssignmentStatus.COMPLETED,
					completedAt: new Date(),
					deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
					assignedBy: adminUserId,
					orderIndex: i,
				},
			});

			await db.review.create({
				data: {
					assignmentId: assignment.id,
					submissionId: id,
					reviewerId: reviewerIds[i],
					round: 1,
					decision: ReviewDecision.ACCEPT,
					comments: "Test review for auto AWAITING_DECISION test.",
				},
			});
		}

		const { checkAndTriggerReviewCompletion } = await import(
			"../../src/lib/server/workflow"
		);
		await checkAndTriggerReviewCompletion(id, reviewerUserId);

		const submission = await db.submission.findUnique({
			where: { id },
			select: { status: true },
		});
		expect(submission?.status).toBe(SubmissionStatus.AWAITING_DECISION);
	});
});
