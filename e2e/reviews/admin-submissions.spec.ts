import { test, expect, createSubmission, createSubmissionWithReview } from "./fixtures";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

// Tests use admin storageState from playwright.config.ts

test.describe("Admin Submission Detail Page", () => {
	test("displays submissions list with status badges", async ({ adminSubmissionsPage }) => {
		// Act
		await adminSubmissionsPage.goto();

		// Assert
		await expect(adminSubmissionsPage.heading).toBeVisible();
		await expect(adminSubmissionsPage.table).toBeVisible();
	});

	test("can search submissions by title", async ({ adminSubmissionsPage, testRun, cleanup }) => {
		// Arrange
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Search Test Submission",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();

		// Act
		await adminSubmissionsPage.search(title);

		// Assert
		await expect(adminSubmissionsPage.getRowByTitle(title)).toBeVisible({ timeout: 10000 });
	});

	test("can open submission detail page", async ({ adminSubmissionsPage, page, testRun, cleanup }) => {
		// Arrange
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Detail Page Test Submission",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);

		// Act
		await adminSubmissionsPage.openSubmissionDetail(title);

		// Assert
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
		// Arrange
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

		// Assert precondition
		await expect(adminSubmissionDetailPage.deskRejectButton).toBeVisible();

		// Act
		await adminSubmissionDetailPage.openDeskRejectDialog();
		await deskRejectDialog.fillReason("This submission is out of scope for the conference.");
		await deskRejectDialog.confirm();

		// Assert
		await expect(page.getByText(/desk rejected/i)).toBeVisible({ timeout: 5000 });
		const status = await adminSubmissionDetailPage.getStatus();
		expect(status).toContain("Rejected");
	});

	test("desk reject requires reason", async ({
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		deskRejectDialog,
		testRun,
		cleanup,
	}) => {
		// Arrange
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

		// Act
		await adminSubmissionDetailPage.openDeskRejectDialog();

		// Assert - button should be disabled when reason is empty
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
		// Arrange
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

		// Assert
		await expect(adminSubmissionDetailPage.assignReviewerButton).toBeVisible();
	});

	test("can open assign reviewer dialog", async ({
		page,
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		assignReviewerDialog,
		testRun,
		cleanup,
	}) => {
		// Arrange
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

		// Act
		await adminSubmissionDetailPage.openAssignReviewerDialog();

		// Assert
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
		// Arrange
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

		// Act
		await adminSubmissionDetailPage.openAssignReviewerDialog();

		// Assert
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
		// Arrange
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

		// Act
		await adminSubmissionDetailPage.openAssignReviewerDialog();
		await assignReviewerDialog.searchReviewer("reviewer");

		// Assert - search completes without error
		await page.waitForLoadState("networkidle");
	});

	test("can close assign reviewer dialog", async ({
		page,
		adminSubmissionsPage,
		adminSubmissionDetailPage,
		assignReviewerDialog,
		testRun,
		cleanup,
	}) => {
		// Arrange
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

		// Act
		await adminSubmissionDetailPage.openAssignReviewerDialog();
		await expect(page.getByRole("dialog")).toBeVisible();
		await assignReviewerDialog.close();

		// Assert
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
		// Arrange - create submission with review (has status history)
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Status History Test",
		});
		cleanup.track(submissionId);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		// Act
		await adminSubmissionDetailPage.switchToHistoryTab();

		// Assert
		await expect(page.getByText("Status History", { exact: true })).toBeVisible();
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
		// Arrange - create submission with completed review
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Reviews Tab Test",
		});
		cleanup.track(submissionId);

		await adminSubmissionsPage.goto();
		await adminSubmissionsPage.search(title);
		await adminSubmissionsPage.openSubmissionDetail(title);
		await adminSubmissionDetailPage.waitForLoad();

		// Assert precondition
		await expect(page.getByRole("tab", { name: /Reviews/i })).toBeVisible();

		// Act
		await adminSubmissionDetailPage.switchToReviewsTab();

		// Assert - should show the completed review
		await expect(page.getByText(/Accept/i).first()).toBeVisible({ timeout: 10000 });
	});
});
