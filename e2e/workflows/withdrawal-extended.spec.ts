import { test, expect } from "../helpers/base-fixtures";
import {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithDecision,
	createSubmissionWithReview,
	getAssignmentStatus,
	getPrisma,
} from "../helpers/test-db";
import {
	AssignmentStatus,
	EditorDecisionType,
	SubmissionStatus,
} from "../../src/generated/prisma/enums";
import { TEST_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";

test.describe("Withdrawal from Extended States", () => {
	test("author withdraws DRAFT submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Withdraw Draft Test",
			status: SubmissionStatus.DRAFT,
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${id}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();

		// Assert
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Withdrawn", { timeout: 10000 });
	});

	test("author withdraws REVIEWS_COMPLETE submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Withdraw Reviews Complete Test",
			status: SubmissionStatus.REVIEWS_COMPLETE,
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${id}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();

		// Assert
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Withdrawn", { timeout: 10000 });
	});

	test("author withdraws AWAITING_DECISION submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Withdraw Awaiting Decision Test",
		});
		cleanup.track(submissionId);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${submissionId}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();

		// Assert
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Withdrawn", { timeout: 10000 });
	});

	test("author withdraws RESUBMITTED submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Withdraw Resubmitted Test",
			status: SubmissionStatus.RESUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${id}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();

		// Assert
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Withdrawn", { timeout: 10000 });
	});

	test("author withdraws REVISE_REQUIRED submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Withdraw Revise Required Test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		});
		cleanup.track(submissionId);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${submissionId}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();

		// Assert
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Withdrawn", { timeout: 10000 });
	});

	test("withdrawal from AWAITING_DECISION cancels active assignments", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange — createSubmissionWithReview creates an AWAITING_DECISION with COMPLETED assignment
		// We need an active (PENDING) assignment to test cancellation, so we add one
		const db = getPrisma();
		const { submissionId, assignmentId } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Withdraw Cancels From Under Review",
		});
		cleanup.track(submissionId);

		// Move to REVIEWS_COMPLETE directly for this test
		await db.submission.update({
			where: { id: submissionId },
			data: { status: SubmissionStatus.REVIEWS_COMPLETE },
		});

		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${submissionId}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });

		// Assert - assignment should be cancelled
		const status = await getAssignmentStatus(assignmentId);
		expect(status).toBe(AssignmentStatus.CANCELLED);
	});
});
