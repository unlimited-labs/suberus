import { test, expect, createSubmission, createSubmissionWithReview, getPrisma } from "./fixtures";
import { SubmissionStatus, ReviewDecision, AssignmentStatus } from "../../src/generated/prisma/enums";

// Tests use admin storageState from playwright.config.ts

test.describe("Admin Submission Detail Page", () => {
	test("displays submissions list with status badges", async ({ adminSubmissionsPage }) => {
		await adminSubmissionsPage.goto();

		await expect(adminSubmissionsPage.heading).toBeVisible();
		await expect(adminSubmissionsPage.table).toBeVisible();
	});

	test("can search submissions by title", async ({ adminSubmissionsPage, testRun, cleanup }) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Search Test Submission",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();

		await adminSubmissionsPage.search(title);

		await expect(adminSubmissionsPage.getRowByTitle(title)).toBeVisible({ timeout: 10000 });
	});

	test("can open submission detail page", async ({ adminSubmissionsPage, page, testRun, cleanup }) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Detail Page Test Submission",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);

		await adminSubmissionsPage.openSubmissionDetail(title);

		await page.waitForURL(/\/admin\/submissions\/[a-f0-9-]+/);
		await expect(page.getByText("Submission Details")).toBeVisible();
	});
});

test.describe("Admin Submissions - Clickable Title", () => {
	test("clicking submission title navigates to detail page", async ({
		adminSubmissionsPage,
		page,
		testRun,
		cleanup,
	}) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Clickable Title Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await expect(adminSubmissionsPage.getRowByTitle(title)).toBeVisible({ timeout: 10000 });

		await page.getByRole("link", { name: title }).click();

		await page.waitForURL(/\/admin\/submissions\/[a-f0-9-]+/);
		await expect(page.getByText("Submission Details")).toBeVisible();
	});
});

test.describe("Submission Detail - Desk Rejection", () => {
	test("can desk reject a submitted submission", async ({
		page,
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		deskRejectDialog,
		testRun,
		cleanup,
	}) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Desk Reject Action Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		await adminSubmissionDetailPage.expectActionAvailable("Desk Reject");

		await adminSubmissionDetailPage.openDeskRejectDialog();
		await deskRejectDialog.fillReason("This submission is out of scope for the conference.");
		await deskRejectDialog.confirm();

		await expect(page.getByText(/desk rejected/i)).toBeVisible({ timeout: 5000 });
		await expect(adminSubmissionDetailPage.getStatusBadge()).toContainText("Rejected", { timeout: 10000 });
	});

	test("desk reject requires reason", async ({
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		deskRejectDialog,
		testRun,
		cleanup,
	}) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Desk Reject Validation Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		await adminSubmissionDetailPage.openDeskRejectDialog();

		await expect(deskRejectDialog.confirmButton).toBeDisabled();
	});
});

test.describe("Submission Detail - Assign Reviewers", () => {
	test("shows assign reviewer button for submitted submissions", async ({
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Assign Button Visibility Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		await adminSubmissionDetailPage.expectActionAvailable("Assign Reviewer");
	});

	test("can open assign reviewer dialog", async ({
		page,
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		assignReviewerDialog,
		testRun,
		cleanup,
	}) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Assign Dialog Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		await adminSubmissionDetailPage.openAssignReviewerDialog();

		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(assignReviewerDialog.searchInput).toBeVisible();
	});

	test("displays available reviewers in dialog", async ({
		page,
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Available Reviewers Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		await adminSubmissionDetailPage.openAssignReviewerDialog();

		await expect(page.getByText("Available Reviewers", { exact: true })).toBeVisible();
		await expect(page.getByText(/Current Reviewers \(/)).toBeVisible();
	});

	test("can search reviewers", async ({
		page,
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		assignReviewerDialog,
		testRun,
		cleanup,
	}) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Search Reviewers Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		await adminSubmissionDetailPage.openAssignReviewerDialog();
		await assignReviewerDialog.searchReviewer("reviewer");

		await expect(page.getByText("reviewer@e2e.local")).toBeVisible({ timeout: 5000 });
	});

	test("can close assign reviewer dialog", async ({
		page,
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		assignReviewerDialog,
		testRun,
		cleanup,
	}) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Close Dialog Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		await adminSubmissionDetailPage.openAssignReviewerDialog();
		await expect(page.getByRole("dialog")).toBeVisible();
		await assignReviewerDialog.close();

		await expect(page.getByRole("dialog")).not.toBeVisible();
	});
});

test.describe("Submission Detail - Status History", () => {
	test("shows history tab with status changes", async ({
		page,
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Status History Test",
		});
		cleanup.track(submissionId);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		await adminSubmissionDetailPage.switchToHistoryTab();

		await expect(page.getByText("Activity History", { exact: true })).toBeVisible();
	});
});

test.describe("Submission Detail - Reviews Tab", () => {
	test("shows reviews tab with review count", async ({
		page,
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Reviews Tab Test",
		});
		cleanup.track(submissionId);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		await expect(page.getByRole("tab", { name: /Reviews/i })).toBeVisible();

		await adminSubmissionDetailPage.switchToReviewsTab();

		await expect(page.getByText(/Accept/i).first()).toBeVisible({ timeout: 10000 });
	});

	test("shows scores and confidence level in review card", async ({
		page,
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const { submissionId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Scores Display Test",
		});
		cleanup.track(submissionId);

		await adminSubmissionDetailPage.goto(submissionId);
		await adminSubmissionDetailPage.switchToReviewsTab();

		// Assert — scores visible (use first() since multiple review cards may exist)
		await expect(page.getByText("Scores").first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Originality").first()).toBeVisible();
		await expect(page.getByText("4/5").first()).toBeVisible();

		await expect(page.getByText("Confidence:").first()).toBeVisible();
	});

	test("shows private notes with editor-only label", async ({
		page,
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const { submissionId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Private Notes Test",
		});
		cleanup.track(submissionId);

		await adminSubmissionDetailPage.goto(submissionId);
		await adminSubmissionDetailPage.switchToReviewsTab();

		await expect(
			page.getByText("Private Notes (editor only)")
		).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Private notes for editors.")).toBeVisible();
	});

	test("round selector appears with multi-round reviews", async ({
		page,
		adminSubmissionDetailPage,
		testRun,
		cleanup,
	}) => {
		const db = getPrisma();
		const { submissionId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Round Selector Test",
		});
		cleanup.track(submissionId);

		const { reviewerUserId, adminUserId } = await import("../helpers/test-db").then(m => m.getTestUserIds());
		const assignment2 = await db.reviewAssignment.create({
			data: {
				submissionId,
				reviewerId: reviewerUserId,
				round: 2,
				status: AssignmentStatus.COMPLETED,
				deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				assignedBy: adminUserId,
				completedAt: new Date(),
				orderIndex: 0,
			},
		});
		await db.review.create({
			data: {
				assignmentId: assignment2.id,
				submissionId,
				reviewerId: reviewerUserId,
				round: 2,
				decision: ReviewDecision.ACCEPT,
				comments: "Round 2 review comment.",
			},
		});
		await db.submission.update({
			where: { id: submissionId },
			data: { currentRound: 2 },
		});

		await adminSubmissionDetailPage.goto(submissionId);
		await adminSubmissionDetailPage.switchToReviewsTab();

		await expect(page.getByText(/Current round/)).toBeVisible({ timeout: 10000 });

		await page.getByText(/Current round/).click();
		await expect(page.getByText("All rounds")).toBeVisible();
	});
});
