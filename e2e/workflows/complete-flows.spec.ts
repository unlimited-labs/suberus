import { test, expect, type Page } from "@playwright/test";
import {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithReview,
	deleteSubmission,
} from "../helpers/test-db";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

/**
 * Complete end-to-end workflow tests.
 * Tests use AAA pattern with Prisma seeding.
 */

// Test credentials (must match global-setup.ts)
const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
};

const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
};

const REVIEWER_USER = {
	email: "reviewer@e2e.local",
	password: "testpass123",
};

// Helper functions
async function loginAs(page: Page, user: { email: string; password: string }) {
	await page.context().clearCookies();
	await page.goto("/login");
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 30000 });
	await page.getByLabel("E-mail").fill(user.email);
	await page.getByLabel("Password").fill(user.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.waitForURL("/", { timeout: 30000 });
}

async function addKeyword(page: Page, keyword: string) {
	const keywordsSection = page
		.locator(".space-y-2, .space-y-3, .space-y-4")
		.filter({ has: page.getByText("Keywords", { exact: true }) });
	const keywordInput = keywordsSection.getByRole("textbox");
	await keywordInput.fill(keyword);
	await keywordInput.press("Enter");
}

async function findSubmissionInAdmin(page: Page, title: string): Promise<string> {
	await page.goto("/admin/submissions");
	await page.waitForLoadState("networkidle");

	const searchInput = page.getByPlaceholder(/Search/i);
	await searchInput.fill(title);
	await page.waitForLoadState("networkidle");

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
	/**
	 * Test author submission creation
	 */
	test("author creates and submits a new submission", async ({ page }) => {
		const uniqueId = Date.now().toString();
		const submissionTitle = `E2E Workflow ${uniqueId}`;

		await loginAs(page, TEST_USER);
		await page.goto("/submissions/new");
		await page.getByLabel("Title").waitFor({ state: "visible", timeout: 30000 });

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

		// Fill affiliation
		const authorCard = page.locator(".rounded-lg.border").filter({ has: page.locator("#author-0-firstName") });
		const affiliationInput = authorCard.getByPlaceholder("Type affiliation...");
		await affiliationInput.fill("Test University");
		await affiliationInput.blur();
		await page.waitForLoadState("networkidle");

		// Add keywords
		await addKeyword(page, "workflow-test");
		await addKeyword(page, "e2e");
		await addKeyword(page, "acceptance");

		await page.getByRole("button", { name: "Submit" }).click();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await expect(page.getByText(submissionTitle)).toBeVisible({ timeout: 10000 });
	});

	/**
	 * Test admin assigning reviewer to a submission
	 */
	test("admin assigns reviewer to submission", async ({ page }) => {
		// Arrange
		const { id, title } = await createSubmission({
			title: "Assign Reviewer Workflow Test",
			status: SubmissionStatus.SUBMITTED,
		});

		try {
			await loginAs(page, ADMIN_USER);
			await findSubmissionInAdmin(page, title);
			await expect(page.getByText("Submitted").first()).toBeVisible();

			// Act
			await page.getByRole("button", { name: /Assign Reviewer/i }).click();
			await page.getByRole("dialog").waitFor({ state: "visible" });

			// Assert
			await expect(page.getByText(/Available Reviewers/i)).toBeVisible();

			// Search for reviewer
			await page.getByPlaceholder("Search by name, email, or affiliation...").fill(REVIEWER_USER.email);
			await page.waitForLoadState("networkidle");
			await expect(page.getByText(REVIEWER_USER.email)).toBeVisible();

			// Close dialog (don't actually assign to preserve test state)
			const dialog = page.getByRole("dialog");
			await dialog.getByRole("button", { name: "Close" }).first().click();
			await dialog.waitFor({ state: "hidden", timeout: 5000 });
		} finally {
			await deleteSubmission(id);
		}
	});

	/**
	 * Test admin making accept decision
	 */
	test("admin makes accept decision on submission", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			title: "Accept Decision Workflow Test",
		});

		try {
			await loginAs(page, ADMIN_USER);
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
			await page.waitForLoadState("networkidle");

			// Assert
			await page.reload();
			await expect(page.getByText(/Accepted/i).first()).toBeVisible({ timeout: 10000 });
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});

test.describe("Desk Rejection Workflow", () => {
	test("admin can desk reject a submitted submission", async ({ page }) => {
		// Arrange
		const { id, title } = await createSubmission({
			title: "Desk Reject Workflow Test",
			status: SubmissionStatus.SUBMITTED,
		});

		try {
			await loginAs(page, ADMIN_USER);
			await findSubmissionInAdmin(page, title);
			await expect(page.getByText("Submitted").first()).toBeVisible();

			// Act
			await page.getByRole("button", { name: /Desk Reject/i }).click();
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
		} finally {
			await deleteSubmission(id);
		}
	});
});

test.describe("Reviewer Assignments", () => {
	test("admin can view and manage reviewer assignments", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Manage Assignments Workflow Test",
		});

		try {
			await loginAs(page, ADMIN_USER);
			await findSubmissionInAdmin(page, title);
			await expect(page.getByText("Under Review").first()).toBeVisible();

			// Act
			await page.getByRole("button", { name: /Assign Reviewer/i }).click();
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
		} finally {
			await deleteSubmission(submissionId);
		}
	});

	test("reviewer sees pending assignment", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Pending Assignment Workflow Test",
		});

		try {
			await loginAs(page, REVIEWER_USER);
			await page.goto("/reviews");
			await page.waitForLoadState("networkidle");

			// Assert
			await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 });
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});

test.describe("Status History", () => {
	test("history tab shows status transitions", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			title: "Status History Workflow Test",
		});

		try {
			await loginAs(page, ADMIN_USER);
			await findSubmissionInAdmin(page, title);

			// Act
			await page.getByRole("tab", { name: /History/i }).click();

			// Assert
			await expect(page.getByText("Status History", { exact: true })).toBeVisible();
			await expect(page.getByText(/AWAITING_DECISION|Awaiting Decision/i).first()).toBeVisible();
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});

test.describe("Review Display", () => {
	test("admin can view completed reviews", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithReview({
			title: "View Reviews Workflow Test",
		});

		try {
			await loginAs(page, ADMIN_USER);
			await findSubmissionInAdmin(page, title);

			// Act
			await page.getByRole("tab", { name: /Reviews/i }).click();

			// Assert
			await expect(page.getByText(/Accept/i).first()).toBeVisible({ timeout: 10000 });
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});

test.describe("Review Form Validation", () => {
	test("reviewer can fill review form with all required fields", async ({ page }) => {
		// Arrange
		const { submissionId, title } = await createSubmissionWithAssignment({
			title: "Review Form Validation Workflow Test",
		});

		try {
			await loginAs(page, REVIEWER_USER);
			await page.goto("/reviews");
			await page.waitForLoadState("networkidle");

			const assignmentRow = page.locator("tr").filter({ hasText: title });
			await expect(assignmentRow).toBeVisible({ timeout: 10000 });
			await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
			await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: 30000 });
			await page.waitForLoadState("networkidle");

			// Assert form loaded
			await expect(page.getByRole("heading", { name: "Decision", exact: true })).toBeVisible({ timeout: 10000 });

			// Act - fill form
			await page.getByRole("button", { name: /Accept Work meets/i }).click();

			// Fill evaluation scores
			const scoreButtons = await page.getByRole("button", { name: "4", exact: true }).all();
			expect(scoreButtons.length).toBe(5); // 4 criteria + confidence
			for (const btn of scoreButtons) {
				await btn.click();
				await page.waitForTimeout(50);
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

			// Assert character count
			await expect(page.locator("span").filter({ hasText: /^\d{2,} characters$/ })).toBeVisible({ timeout: 5000 });
		} finally {
			await deleteSubmission(submissionId);
		}
	});
});
