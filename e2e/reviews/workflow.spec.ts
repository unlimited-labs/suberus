import {
	test,
	expect,
	AdminSubmissionsPage,
	AdminSubmissionDetailPage,
	EditorDecisionDialog,
	ReviewerAssignmentsPage,
	ReviewFormPage,
	ADMIN_USER,
	REVIEWER_USER,
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithReview,
} from "./fixtures";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

/**
 * Integration tests for the review workflow.
 * Tests use AAA pattern with Prisma seeding and automatic cleanup via fixtures.
 */

test.describe("Review Workflow - Admin Actions", () => {
	test.describe("Submission Status Transitions", () => {
		test("admin can view submission with correct status badges", async ({ page, testRun, cleanup }) => {
			// Arrange
			const { id } = await createSubmission({
				testRunId: testRun.testRunId,
				title: "Status Badges Test",
				status: SubmissionStatus.SUBMITTED,
			});
			cleanup.track(id);

			// Login as admin
			await page.goto("/login");
			await page.getByLabel("E-mail").fill(ADMIN_USER.email);
			await page.getByLabel("Password").fill(ADMIN_USER.password);
			await page.getByRole("button", { name: "Sign in" }).click();
			await page.waitForURL("/");

			// Act
			const submissionsPage = new AdminSubmissionsPage(page);
			await submissionsPage.goto();

			// Assert
			await expect(submissionsPage.heading).toBeVisible();
		});

		test("submitted status shows desk reject and assign reviewer buttons", async ({ page, testRun, cleanup }) => {
			// Arrange
			const { id, title } = await createSubmission({
				testRunId: testRun.testRunId,
				title: "Submitted Buttons Test",
				status: SubmissionStatus.SUBMITTED,
			});
			cleanup.track(id);

			// Login as admin
			await page.goto("/login");
			await page.getByLabel("E-mail").fill(ADMIN_USER.email);
			await page.getByLabel("Password").fill(ADMIN_USER.password);
			await page.getByRole("button", { name: "Sign in" }).click();
			await page.waitForURL("/");

			const submissionsPage = new AdminSubmissionsPage(page);
			await submissionsPage.goto();
			await submissionsPage.search(title);
			await submissionsPage.openSubmissionDetail(title);

			const detailPage = new AdminSubmissionDetailPage(page);
			await detailPage.waitForLoad();

			// Assert
			await expect(detailPage.deskRejectButton).toBeVisible();
			await expect(detailPage.assignReviewerButton).toBeVisible();
		});

		test("under review status shows assign reviewer but not desk reject", async ({ page, testRun, cleanup }) => {
			// Arrange
			const { submissionId, title } = await createSubmissionWithAssignment({
				testRunId: testRun.testRunId,
				title: "Under Review Buttons Test",
			});
			cleanup.track(submissionId);

			// Login as admin
			await page.goto("/login");
			await page.getByLabel("E-mail").fill(ADMIN_USER.email);
			await page.getByLabel("Password").fill(ADMIN_USER.password);
			await page.getByRole("button", { name: "Sign in" }).click();
			await page.waitForURL("/");

			const submissionsPage = new AdminSubmissionsPage(page);
			await submissionsPage.goto();
			await submissionsPage.search(title);
			await submissionsPage.openSubmissionDetail(title);

			const detailPage = new AdminSubmissionDetailPage(page);
			await detailPage.waitForLoad();

			// Assert
			await expect(detailPage.assignReviewerButton).toBeVisible();
			await expect(detailPage.deskRejectButton).not.toBeVisible();
		});

		test("awaiting decision status shows make decision button", async ({ page, testRun, cleanup }) => {
			// Arrange
			const { submissionId, title } = await createSubmissionWithReview({
				testRunId: testRun.testRunId,
				title: "Awaiting Decision Buttons Test",
			});
			cleanup.track(submissionId);

			// Login as admin
			await page.goto("/login");
			await page.getByLabel("E-mail").fill(ADMIN_USER.email);
			await page.getByLabel("Password").fill(ADMIN_USER.password);
			await page.getByRole("button", { name: "Sign in" }).click();
			await page.waitForURL("/");

			const submissionsPage = new AdminSubmissionsPage(page);
			await submissionsPage.goto();
			await submissionsPage.search(title);
			await submissionsPage.openSubmissionDetail(title);

			const detailPage = new AdminSubmissionDetailPage(page);
			await detailPage.waitForLoad();

			// Assert
			await expect(detailPage.makeDecisionButton).toBeVisible();
		});
	});

	test.describe("Editor Decision Dialog", () => {
		test("editor decision dialog shows decision options", async ({ page, testRun, cleanup }) => {
			// Arrange
			const { submissionId, title } = await createSubmissionWithReview({
				testRunId: testRun.testRunId,
				title: "Decision Options Test",
			});
			cleanup.track(submissionId);

			// Login as admin
			await page.goto("/login");
			await page.getByLabel("E-mail").fill(ADMIN_USER.email);
			await page.getByLabel("Password").fill(ADMIN_USER.password);
			await page.getByRole("button", { name: "Sign in" }).click();
			await page.waitForURL("/");

			const submissionsPage = new AdminSubmissionsPage(page);
			await submissionsPage.goto();
			await submissionsPage.search(title);
			await submissionsPage.openSubmissionDetail(title);

			const detailPage = new AdminSubmissionDetailPage(page);
			await detailPage.waitForLoad();

			// Act
			await detailPage.openEditorDecisionDialog();

			// Assert
			await expect(page.getByRole("button", { name: /Accept.*publication/i })).toBeVisible();
			await expect(page.getByRole("button", { name: /Conditionally Accept/i })).toBeVisible();
			await expect(page.getByRole("button", { name: /Revise & Resubmit/i })).toBeVisible();
			await expect(page.getByRole("button", { name: /Reject.*not meet/i })).toBeVisible();
		});

		test("editor can accept submission", async ({ page, testRun, cleanup }) => {
			// Arrange
			const { submissionId, title } = await createSubmissionWithReview({
				testRunId: testRun.testRunId,
				title: "Accept Decision Test",
			});
			cleanup.track(submissionId);

			// Login as admin
			await page.goto("/login");
			await page.getByLabel("E-mail").fill(ADMIN_USER.email);
			await page.getByLabel("Password").fill(ADMIN_USER.password);
			await page.getByRole("button", { name: "Sign in" }).click();
			await page.waitForURL("/");

			const submissionsPage = new AdminSubmissionsPage(page);
			await submissionsPage.goto();
			await submissionsPage.search(title);
			await submissionsPage.openSubmissionDetail(title);

			const detailPage = new AdminSubmissionDetailPage(page);
			await detailPage.waitForLoad();

			// Act
			await detailPage.openEditorDecisionDialog();

			const decisionDialog = new EditorDecisionDialog(page);
			await page.getByRole("button", { name: /Accept.*publication/i }).click();
			await decisionDialog.fillReasoning("Strong work that meets all criteria.");
			await decisionDialog.fillLetter("Congratulations! Your submission has been accepted.");
			await decisionDialog.submit();

			// Assert
			await expect(page.getByText(/Decision submitted/i)).toBeVisible({ timeout: 5000 });
			await page.reload();
			await expect(page.getByText(/Accepted/i).first()).toBeVisible({ timeout: 10000 });
		});
	});
});

test.describe("Review Workflow - Reviewer Actions", () => {
	test("reviewer can see their assignments page", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer Assignments Test",
		});
		cleanup.track(submissionId);

		// Login as reviewer
		await page.goto("/login");
		await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
		await page.getByLabel("Password").fill(REVIEWER_USER.password);
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.waitForURL("/");

		const assignmentsPage = new ReviewerAssignmentsPage(page);
		await assignmentsPage.goto();

		// Assert
		await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 });
	});

	test("reviewer can access review form for pending assignment", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Review Form Access Test",
		});
		cleanup.track(submissionId);

		// Login as reviewer
		await page.goto("/login");
		await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 });
		await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
		await page.getByLabel("Password").fill(REVIEWER_USER.password);
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.waitForURL("/", { timeout: 30000 });

		const assignmentsPage = new ReviewerAssignmentsPage(page);
		await assignmentsPage.goto();

		// Act
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/);

		const reviewForm = new ReviewFormPage(page);

		// Assert
		await expect(reviewForm.commentsInput).toBeVisible({ timeout: 15000 });
		await expect(reviewForm.submitButton).toBeVisible();
	});

	test("review form shows decision options", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Decision Options Form Test",
		});
		cleanup.track(submissionId);

		// Login as reviewer
		await page.goto("/login");
		await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
		await page.getByLabel("Password").fill(REVIEWER_USER.password);
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.waitForURL("/");

		const assignmentsPage = new ReviewerAssignmentsPage(page);
		await assignmentsPage.goto();

		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/);

		// Assert
		await expect(page.getByRole("button", { name: /Accept Work meets/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /Accept with Minor Revisions/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /Revise and Resubmit/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /Reject Work does not/i })).toBeVisible();
	});

	test("review form validates minimum comment length", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Comment Validation Test",
		});
		cleanup.track(submissionId);

		// Login as reviewer
		await page.goto("/login");
		await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
		await page.getByLabel("Password").fill(REVIEWER_USER.password);
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.waitForURL("/");

		const assignmentsPage = new ReviewerAssignmentsPage(page);
		await assignmentsPage.goto();

		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/);

		const reviewForm = new ReviewFormPage(page);

		// Act
		const commentsField = page.getByRole("textbox", { name: "Review Comments" });
		await commentsField.click();
		await commentsField.pressSequentially("Too short", { delay: 5 });

		// Assert
		await expect(reviewForm.submitButton).toBeDisabled();
		await expect(page.getByText(/min. 50 required/i)).toBeVisible();
	});
});

test.describe("Review Workflow - Submission Detail Tabs", () => {
	test("content tab shows submission details and authors", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Content Tab Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		// Login as admin
		await page.goto("/login");
		await page.getByLabel("E-mail").fill(ADMIN_USER.email);
		await page.getByLabel("Password").fill(ADMIN_USER.password);
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.waitForURL("/");

		const submissionsPage = new AdminSubmissionsPage(page);
		await submissionsPage.goto();
		await submissionsPage.search(title);
		await submissionsPage.openSubmissionDetail(title);

		const detailPage = new AdminSubmissionDetailPage(page);
		await detailPage.waitForLoad();

		// Assert
		await expect(page.getByRole("tab", { name: /Content/i })).toBeVisible();
		await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Authors$/ })).toBeVisible();
		await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Content$/ })).toBeVisible();
		await expect(page.getByText(/Reviewers \(/)).toBeVisible();
	});

	test("reviews tab shows submitted reviews", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Reviews Tab Content Test",
		});
		cleanup.track(submissionId);

		// Login as admin
		await page.goto("/login");
		await page.getByLabel("E-mail").fill(ADMIN_USER.email);
		await page.getByLabel("Password").fill(ADMIN_USER.password);
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.waitForURL("/");

		const submissionsPage = new AdminSubmissionsPage(page);
		await submissionsPage.goto();
		await submissionsPage.search(title);
		await submissionsPage.openSubmissionDetail(title);

		const detailPage = new AdminSubmissionDetailPage(page);
		await detailPage.waitForLoad();

		// Act
		await detailPage.switchToReviewsTab();

		// Assert
		await expect(page.getByText(/Accept/i).first()).toBeVisible({ timeout: 10000 });
	});

	test("history tab shows status transitions", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "History Tab Test",
		});
		cleanup.track(submissionId);

		// Login as admin
		await page.goto("/login");
		await page.getByLabel("E-mail").fill(ADMIN_USER.email);
		await page.getByLabel("Password").fill(ADMIN_USER.password);
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.waitForURL("/");

		const submissionsPage = new AdminSubmissionsPage(page);
		await submissionsPage.goto();
		await submissionsPage.search(title);
		await submissionsPage.openSubmissionDetail(title);

		const detailPage = new AdminSubmissionDetailPage(page);
		await detailPage.waitForLoad();

		// Act
		await detailPage.switchToHistoryTab();

		// Assert
		await expect(page.getByText("Status History")).toBeVisible();
		await expect(page.getByText(/AWAITING_DECISION|Awaiting Decision/i).first()).toBeVisible();
	});
});
