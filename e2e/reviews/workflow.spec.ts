import { test as base, expect } from "@playwright/test";
import {
	AdminSubmissionsPage,
	AdminSubmissionDetailPage,
	EditorDecisionDialog,
	ReviewerAssignmentsPage,
	ReviewFormPage,
	ADMIN_USER,
	REVIEWER_USER,
} from "./fixtures";
import {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithReview,
	deleteSubmission,
} from "../helpers/test-db";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

/**
 * Integration tests for the review workflow.
 * Tests use AAA pattern with Prisma seeding.
 */

const test = base.extend<{
	adminContext: ReturnType<typeof base.extend>;
	reviewerContext: ReturnType<typeof base.extend>;
}>({});

test.describe("Review Workflow - Admin Actions", () => {
	test.describe("Submission Status Transitions", () => {
		test("admin can view submission with correct status badges", async ({ page }) => {
			// Arrange
			const { id } = await createSubmission({
				title: "Status Badges Test",
				status: SubmissionStatus.SUBMITTED,
			});

			try {
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
			} finally {
				await deleteSubmission(id);
			}
		});

		test("submitted status shows desk reject and assign reviewer buttons", async ({ page }) => {
			// Arrange
			const { id, title } = await createSubmission({
				title: "Submitted Buttons Test",
				status: SubmissionStatus.SUBMITTED,
			});

			try {
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
			} finally {
				await deleteSubmission(id);
			}
		});

		test("under review status shows assign reviewer but not desk reject", async ({ page }) => {
			// Arrange
			const { submissionId, title } = await createSubmissionWithAssignment({
				title: "Under Review Buttons Test",
			});

			try {
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
			} finally {
				await deleteSubmission(submissionId);
			}
		});

		test("awaiting decision status shows make decision button", async ({ page }) => {
			// Arrange
			const { submissionId, title } = await createSubmissionWithReview({
				title: "Awaiting Decision Buttons Test",
			});

			try {
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
			} finally {
				await deleteSubmission(submissionId);
			}
		});
	});

	test.describe("Editor Decision Dialog", () => {
		test("editor decision dialog shows decision options", async ({ page }) => {
			// Arrange
			const { submissionId, title } = await createSubmissionWithReview({
				title: "Decision Options Test",
			});

			try {
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
			} finally {
				await deleteSubmission(submissionId);
			}
		});

		test("editor can accept submission", async ({ page }) => {
			// Arrange
			const { submissionId, title } = await createSubmissionWithReview({
				title: "Accept Decision Test",
			});

			try {
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
			} finally {
				await deleteSubmission(submissionId);
			}
		});
	});
});

test.describe("Review Workflow - Reviewer Actions", () => {
	test("reviewer can see their assignments page", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Reviewer Assignments Test",
		});

		try {
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
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("reviewer can access review form for pending assignment", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Review Form Access Test",
		});

		try {
			// Login as reviewer
			await page.goto("/login");
			await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
			await page.getByLabel("Password").fill(REVIEWER_USER.password);
			await page.getByRole("button", { name: "Sign in" }).click();
			await page.waitForURL("/");

			const assignmentsPage = new ReviewerAssignmentsPage(page);
			await assignmentsPage.goto();
			await page.waitForLoadState("networkidle");

			// Act
			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/);

			const reviewForm = new ReviewFormPage(page);

			// Assert
			await expect(reviewForm.commentsInput).toBeVisible({ timeout: 10000 });
			await expect(reviewForm.submitButton).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("review form shows decision options", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Decision Options Form Test",
		});

		try {
			// Login as reviewer
			await page.goto("/login");
			await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
			await page.getByLabel("Password").fill(REVIEWER_USER.password);
			await page.getByRole("button", { name: "Sign in" }).click();
			await page.waitForURL("/");

			const assignmentsPage = new ReviewerAssignmentsPage(page);
			await assignmentsPage.goto();
			await page.waitForLoadState("networkidle");

			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/);
			await page.waitForLoadState("networkidle");

			// Assert
			await expect(page.getByRole("button", { name: /Accept Work meets/i })).toBeVisible();
			await expect(page.getByRole("button", { name: /Accept with Minor Revisions/i })).toBeVisible();
			await expect(page.getByRole("button", { name: /Revise and Resubmit/i })).toBeVisible();
			await expect(page.getByRole("button", { name: /Reject Work does not/i })).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("review form validates minimum comment length", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Comment Validation Test",
		});

		try {
			// Login as reviewer
			await page.goto("/login");
			await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
			await page.getByLabel("Password").fill(REVIEWER_USER.password);
			await page.getByRole("button", { name: "Sign in" }).click();
			await page.waitForURL("/");

			const assignmentsPage = new ReviewerAssignmentsPage(page);
			await assignmentsPage.goto();
			await page.waitForLoadState("networkidle");

			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/);
			await page.waitForLoadState("networkidle");

			const reviewForm = new ReviewFormPage(page);

			// Act
			const commentsField = page.getByRole("textbox", { name: "Review Comments" });
			await commentsField.click();
			await commentsField.pressSequentially("Too short", { delay: 5 });

			// Assert
			await expect(reviewForm.submitButton).toBeDisabled();
			await expect(page.getByText(/min. 50 required/i)).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});

test.describe("Review Workflow - Submission Detail Tabs", () => {
	test("content tab shows submission details and authors", async ({ page }) => {
		// Arrange
		const { id, title } = await createSubmission({
			title: "Content Tab Test",
			status: SubmissionStatus.SUBMITTED,
		});

		try {
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
		} finally {
			await deleteSubmission(id);
		}
	});

	test("reviews tab shows submitted reviews", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			title: "Reviews Tab Content Test",
		});

		try {
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
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("history tab shows status transitions", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			title: "History Tab Test",
		});

		try {
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
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});
