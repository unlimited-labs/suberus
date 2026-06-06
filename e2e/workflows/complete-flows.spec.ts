import { type Page } from "@playwright/test";
import { test, expect } from "../helpers/base-fixtures";
import {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithReview,
} from "../helpers/test-db";
import { SubmissionStatus } from "../../src/generated/prisma/enums";
import { TEST_USER, ADMIN_USER, REVIEWER_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";
import { runSubmissionAction } from "../helpers/submission-actions";

/**
 * Complete end-to-end workflow tests.
 * Tests use AAA pattern with Prisma seeding.
 */

async function addKeyword(page: Page, keyword: string) {
	// Find Keywords section by heading
	const keywordsHeading = page.getByRole("heading", { name: "Keywords", exact: true });
	await expect(keywordsHeading).toBeVisible({ timeout: 10000 });

	// The keywords input has a specific class: min-w-[120px]
	const keywordInput = page.locator("input.min-w-\\[120px\\]");
	await expect(keywordInput).toBeVisible();
	await keywordInput.fill(keyword);
	await keywordInput.press("Enter");
	// Wait for the keyword badge to appear (exact match)
	await expect(page.getByText(keyword, { exact: true })).toBeVisible();
}

async function findSubmissionInAdmin(page: Page, title: string): Promise<string> {
	await page.goto("/admin/submissions");
	const searchInput = page.getByPlaceholder(/Search/i);
	await expect(searchInput).toBeVisible({ timeout: 10000 });
	await searchInput.fill(title);

	const row = page.locator("tr").filter({ hasText: title }).first();
	await expect(row).toBeVisible({ timeout: 10000 });

	await row.getByRole("button").last().click();
	await page.getByRole("menuitem", { name: /View/i }).click();
	await page.waitForURL(/\/admin\/submissions\/[a-f0-9-]+/);

	const url = page.url();
	const match = url.match(/\/admin\/submissions\/([a-f0-9-]+)/);
	if (!match) throw new Error(`Could not extract submission ID from URL: ${url}`);
	return match[1];
}

// ============================================================================
// WORKFLOW TESTS - Using AAA pattern with Prisma seeding
// ============================================================================

test.describe("Complete Submission Workflow", () => {
	test("author creates and submits a new submission", async ({ page, testRun }) => {
		test.slow();
		// Arrange
		const submissionTitle = `${testRun.testRunId}_E2E Workflow`;
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto("/submissions/new");
		await page.getByLabel("Title").waitFor({ state: "visible", timeout: 30000 });
		// Wait for author auto-fill from useSession()
		const authorCard = page.locator('[data-testid="author-card-0"]');
		await expect(authorCard.getByLabel("First name")).not.toHaveValue("", { timeout: 10000 });

		// Act
		await page.getByLabel("Title").fill(submissionTitle);
		await page.getByLabel("Abstract").fill(
			"This is a comprehensive test submission for the complete workflow test. " +
				"The purpose of this submission is to validate the entire lifecycle from " +
				"creation through review to final acceptance. This abstract discusses the " +
				"methodology, results, and conclusions of our testing approach. The testing " +
				"framework ensures that all components are functioning as expected and that " +
				"the user experience is smooth and intuitive throughout the entire process. " +
				"Additional context is provided here to meet the minimum character requirements."
		);

		const affiliationInput = authorCard.getByLabel("Affiliation");
		await affiliationInput.fill("Test University");
		const affiliationOption = page.getByRole("option").filter({ hasText: "Test University" }).first();
		await affiliationOption.waitFor({ state: "visible", timeout: 10000 });
		await affiliationOption.click();
		await expect(affiliationInput).toHaveValue("Test University", { timeout: 5000 });

		await addKeyword(page, "workflow-test");
		await addKeyword(page, "e2e");
		await addKeyword(page, "acceptance");

		await page.getByRole("button", { name: "Submit" }).click();

		// Assert - wait for content (doesn't depend on load event)
		await expect(page.getByText(submissionTitle)).toBeVisible({ timeout: 60000 });
	});

	/**
	 * Test admin assigning reviewer to a submission
	 */
	test("admin assigns reviewer to submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Assign Reviewer Workflow Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);
		await expect(page.getByText("Submitted").first()).toBeVisible();

		// Act
		await runSubmissionAction(page, "Assign Reviewer");
		await page.getByRole("dialog").waitFor({ state: "visible" });

		// Assert
		await expect(page.getByText(/Available Reviewers/i)).toBeVisible();

		// Search for reviewer
		await page.getByPlaceholder("Search by name, email, or affiliation...").fill(REVIEWER_USER.email);
			await expect(page.getByText(REVIEWER_USER.email)).toBeVisible();

		// Close dialog (don't actually assign to preserve test state)
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("button", { name: "Close" }).first().click();
		await dialog.waitFor({ state: "hidden", timeout: 5000 });
	});

	/**
	 * Test admin making accept decision
	 */
	test("admin makes accept decision on submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Accept Decision Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);

		// Verify submission is awaiting decision
		await expect(page.getByText(/Awaiting Decision/i).first()).toBeVisible();

		// Act
		const makeDecisionBtn = page.getByRole("button", { name: /Make Decision/i });
		await makeDecisionBtn.click();
		await page.getByRole("dialog").waitFor({ state: "visible" });

		await page.getByRole("button", { name: /Accept.*publication/i }).click();
		await page.getByLabel(/Internal Reasoning/i).fill("Excellent submission - Accept");
		await page.getByLabel(/Letter to Author/i).fill("Congratulations, your submission has been accepted.");
		await page.getByRole("button", { name: /Submit Decision/i }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 5000 });

		// Assert
		await page.reload();
		await expect(page.getByText(/Accepted/i).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Desk Rejection Workflow", () => {
	test("admin can desk reject a submitted submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Desk Reject Workflow Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);
		await expect(page.getByText("Submitted").first()).toBeVisible();

		// Act
		await runSubmissionAction(page, "Desk Reject");
		await page.getByRole("dialog").waitFor({ state: "visible" });

		await page.getByLabel(/Reason/i).fill("Out of scope for this conference - E2E test");
		await page.getByRole("button", { name: /Reject Submission/i }).click();

		await Promise.race([
			page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
			page.locator("[data-sonner-toast]").waitFor({ state: "visible", timeout: 15000 }),
		]);

		// Assert
		await page.reload();
		await expect(page.getByText(/Rejected/i).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Reviewer Assignments", () => {
	test("admin can view and manage reviewer assignments", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Manage Assignments Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);
		await expect(page.getByText("Under Review").first()).toBeVisible();

		// Act
		await runSubmissionAction(page, "Assign Reviewer");
		const dialog = page.getByRole("dialog");
		await dialog.waitFor({ state: "visible" });

		// Assert
		await expect(page.getByText(/Current Reviewers \(/i)).toBeVisible();
		await expect(page.getByText("Available Reviewers", { exact: true })).toBeVisible();
		// Reviewer email appears in both current reviewers section and available reviewers
		await expect(page.getByText(REVIEWER_USER.email).first()).toBeVisible();

		// Close dialog
		await dialog.getByRole("button", { name: "Close" }).first().click();
		await dialog.waitFor({ state: "hidden", timeout: 5000 });
	});

	test("reviewer sees pending assignment", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Pending Assignment Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto("/reviews");
	
		// Assert
		await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Status History", () => {
	test("history tab shows status transitions", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Status History Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);

		// Act
		await page.getByRole("tab", { name: /History/i }).click();

		// Assert
		await expect(page.getByText("Activity History", { exact: true })).toBeVisible();
		await expect(page.getByText(/AWAITING_DECISION|Awaiting Decision/i).first()).toBeVisible();
	});
});

test.describe("Review Display", () => {
	test("admin can view completed reviews", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "View Reviews Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);

		// Act
		await page.getByRole("tab", { name: /Reviews/i }).click();

		// Assert
		await expect(page.getByText(/Accept/i).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Review Form Validation", () => {
	test("reviewer can fill review form with all required fields", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Review Form Validation Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto("/reviews");
	
		const assignmentRow = page.locator("tr").filter({ hasText: title });
		await expect(assignmentRow).toBeVisible({ timeout: 10000 });
		await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
		await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
	
		// Assert form loaded
		await expect(page.getByRole("heading", { name: "Decision", exact: true })).toBeVisible({ timeout: 10000 });

		// Act - fill form
		await page.getByRole("button", { name: /Accept Work meets/i }).click();

		// Fill evaluation scores
		const scoreButtons = await page.getByRole("button", { name: "4", exact: true }).all();
		expect(scoreButtons.length).toBe(5); // 4 criteria + confidence
		for (const btn of scoreButtons) {
			await btn.click();
		}

		// Assert confidence shows "High"
		await expect(page.getByText("High: Expert in this area")).toBeVisible();

		// Fill comments
		const commentsField = page.getByRole("textbox", { name: "Review Comments" });
		await commentsField.click();
		await commentsField.pressSequentially(
			"This is a detailed review with sufficient content to meet minimum requirements for submission.",
			{ delay: 5 }
		);

		// Assert submit button is enabled after filling all required fields
		await expect(page.getByRole("button", { name: "Submit Review" })).toBeEnabled();
	});
});
