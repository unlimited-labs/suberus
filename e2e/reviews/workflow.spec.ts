import {
	test,
	expect,
	AdminSubmissionsPage,
	EditorDecisionDialog,
	ReviewerAssignmentsPage,
	ReviewFormPage,
	REVIEWER_USER,
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithReview,
	loginAsAdminViaForm,
	openAdminSubmissionDetail,
} from "./fixtures";
import { SubmissionStatus } from "../../src/generated/prisma/enums";
import { openReviewFromAssignmentList } from "../helpers/reviews";

test.describe("Review Workflow - Admin Actions", () => {
	test.describe("Submission Status Transitions", () => {
		test("admin can view submission with correct status badges", async ({ page, testRun, cleanup }) => {
			const { id } = await createSubmission({
				testRunId: testRun.testRunId,
				title: "Status Badges Test",
				status: SubmissionStatus.SUBMITTED,
			});
			cleanup.track(id);

			await loginAsAdminViaForm(page);

			const submissionsPage = new AdminSubmissionsPage(page);
			await submissionsPage.goto();

			await expect(submissionsPage.heading).toBeVisible();
		});

		test("submitted status shows desk reject and assign reviewer buttons", async ({ page, testRun, cleanup }) => {
			const { id, title } = await createSubmission({
				testRunId: testRun.testRunId,
				title: "Submitted Buttons Test",
				status: SubmissionStatus.SUBMITTED,
			});
			cleanup.track(id);

			await loginAsAdminViaForm(page);

			const detailPage = await openAdminSubmissionDetail(page, title);

			await detailPage.expectActionAvailable("Desk Reject");
			await detailPage.expectActionAvailable("Assign Reviewer");
		});

		test("under review status shows assign reviewer but not desk reject", async ({ page, testRun, cleanup }) => {
			const { submissionId, title } = await createSubmissionWithAssignment({
				testRunId: testRun.testRunId,
				title: "Under Review Buttons Test",
			});
			cleanup.track(submissionId);

			await loginAsAdminViaForm(page);

			const detailPage = await openAdminSubmissionDetail(page, title);

			await detailPage.expectActionAvailable("Assign Reviewer");
			await detailPage.expectActionUnavailable("Desk Reject");
		});

		test("awaiting decision status shows make decision button", async ({ page, testRun, cleanup }) => {
			const { submissionId, title } = await createSubmissionWithReview({
				testRunId: testRun.testRunId,
				title: "Awaiting Decision Buttons Test",
			});
			cleanup.track(submissionId);

			await loginAsAdminViaForm(page);

			const detailPage = await openAdminSubmissionDetail(page, title);

			await detailPage.expectActionAvailable("Make Decision");
		});
	});

	test.describe("Editor Decision Dialog", () => {
		test("editor decision dialog shows decision options", async ({ page, testRun, cleanup }) => {
			const { submissionId, title } = await createSubmissionWithReview({
				testRunId: testRun.testRunId,
				title: "Decision Options Test",
			});
			cleanup.track(submissionId);

			await loginAsAdminViaForm(page);

			const detailPage = await openAdminSubmissionDetail(page, title);

			await detailPage.openEditorDecisionDialog();

			await expect(page.getByRole("button", { name: /Accept.*publication/i })).toBeVisible();
			await expect(page.getByRole("button", { name: /Conditionally Accept/i })).toBeVisible();
			await expect(page.getByRole("button", { name: /Revise & Resubmit/i })).toBeVisible();
			await expect(page.getByRole("button", { name: /Reject.*not meet/i })).toBeVisible();
		});

		test("editor can accept submission", async ({ page, testRun, cleanup }) => {
			const { submissionId, title } = await createSubmissionWithReview({
				testRunId: testRun.testRunId,
				title: "Accept Decision Test",
			});
			cleanup.track(submissionId);

			await loginAsAdminViaForm(page);

			const detailPage = await openAdminSubmissionDetail(page, title);

			await detailPage.openEditorDecisionDialog();

			const decisionDialog = new EditorDecisionDialog(page);
			await page.getByRole("button", { name: /Accept.*publication/i }).click();
			await decisionDialog.fillReasoning("Strong work that meets all criteria.");
			await decisionDialog.fillLetter("Congratulations! Your submission has been accepted.");
			await decisionDialog.submit();

			await expect(page.getByText(/Decision submitted/i)).toBeVisible({ timeout: 5000 });
			await page.reload();
			await expect(page.getByText(/Accepted/i).first()).toBeVisible({ timeout: 10000 });
		});
	});
});

test.describe("Review Workflow - Reviewer Actions", () => {
	test("reviewer can see their assignments page", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Reviewer Assignments Test",
		});
		cleanup.track(submissionId);

		await page.goto("/login");
		await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
		await page.getByLabel("Password", { exact: true }).fill(REVIEWER_USER.password);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await page.waitForURL("/");

		const assignmentsPage = new ReviewerAssignmentsPage(page);
		await assignmentsPage.goto();

		await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 });
	});

	test("reviewer can access review form for pending assignment", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Review Form Access Test",
		});
		cleanup.track(submissionId);

		await page.goto("/login");
		await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 });
		await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
		await page.getByLabel("Password", { exact: true }).fill(REVIEWER_USER.password);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await page.waitForURL("/", { timeout: 30000 });

		const assignmentsPage = new ReviewerAssignmentsPage(page);
		await assignmentsPage.goto();

		await openReviewFromAssignmentList(page, title);

		const reviewForm = new ReviewFormPage(page);

		await expect(reviewForm.commentsInput).toBeVisible({ timeout: 15000 });
		await expect(reviewForm.submitButton).toBeVisible();
	});

	test("review form shows decision options", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Decision Options Form Test",
		});
		cleanup.track(submissionId);

		await page.goto("/login");
		await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
		await page.getByLabel("Password", { exact: true }).fill(REVIEWER_USER.password);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await page.waitForURL("/");

		const assignmentsPage = new ReviewerAssignmentsPage(page);
		await assignmentsPage.goto();

		await openReviewFromAssignmentList(page, title);

		await expect(page.getByRole("button", { name: /Accept Recommends accepting/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /Accept with Minor Revisions/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /Revise and Resubmit/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /Reject Recommends rejection/i })).toBeVisible();
	});

	test("review form shows guidelines with minimum comment length", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Comment Validation Test",
		});
		cleanup.track(submissionId);

		await page.goto("/login");
		await page.getByLabel("E-mail").fill(REVIEWER_USER.email);
		await page.getByLabel("Password", { exact: true }).fill(REVIEWER_USER.password);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await page.waitForURL("/");

		const assignmentsPage = new ReviewerAssignmentsPage(page);
		await assignmentsPage.goto();

		await openReviewFromAssignmentList(page, title);

		const reviewForm = new ReviewFormPage(page);
		await expect(reviewForm.submitButton).toBeEnabled();

		// Guidelines mention minimum comment length
		await expect(page.getByText("Minimum 50 characters for comments")).toBeVisible();
	});
});

test.describe("Review Workflow - Submission Detail Tabs", () => {
	test("content tab shows submission details and authors", async ({ page, testRun, cleanup }) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Content Tab Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await loginAsAdminViaForm(page);

		await openAdminSubmissionDetail(page, title);

		await expect(page.getByRole("tab", { name: /Content/i })).toBeVisible();
		await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Authors$/ })).toBeVisible();
		await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Content$/ })).toBeVisible();
		await expect(page.getByText(/Reviewers \(/)).toBeVisible();
	});

	test("reviews tab shows submitted reviews", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Reviews Tab Content Test",
		});
		cleanup.track(submissionId);

		await loginAsAdminViaForm(page);

		const detailPage = await openAdminSubmissionDetail(page, title);

		await detailPage.switchToReviewsTab();

		await expect(page.getByText(/Accept/i).first()).toBeVisible({ timeout: 10000 });
	});

	test("history tab shows status transitions", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "History Tab Test",
		});
		cleanup.track(submissionId);

		await loginAsAdminViaForm(page);

		const detailPage = await openAdminSubmissionDetail(page, title);

		await detailPage.switchToHistoryTab();

		await expect(page.getByText("Activity History")).toBeVisible();
		await expect(page.getByText(/AWAITING_DECISION|Awaiting Decision/i).first()).toBeVisible();
	});
});
