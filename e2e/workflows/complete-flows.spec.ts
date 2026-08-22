import { type Page } from "@playwright/test";
import { test, expect } from "../helpers/base-fixtures";
import { waitForDialogToClose } from "../helpers/dialog";
import {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithReview,
} from "../helpers/test-db";
import { SubmissionStatus } from "../../src/generated/prisma/enums";
import { TEST_USER, ADMIN_USER, REVIEWER_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";
import { runSubmissionAction } from "../helpers/submission-actions";
import { openReviewFromAssignmentList } from "../helpers/reviews";

async function addKeyword(page: Page, keyword: string) {
	const keywordsHeading = page.getByRole("heading", { name: "Keywords", exact: true });
	await expect(keywordsHeading).toBeVisible({ timeout: 10000 });

	const keywordInput = page.getByTestId("keywords-section").locator("input");
	await expect(keywordInput).toBeVisible();
	await keywordInput.fill(keyword);
	await keywordInput.press("Enter");
	await expect(page.getByText(keyword, { exact: true })).toBeVisible();
}

async function findSubmissionInAdmin(page: Page, title: string): Promise<string> {
	await page.goto("/admin/submissions");
	const searchInput = page.getByPlaceholder(/Search/i);
	await expect(searchInput).toBeVisible({ timeout: 10000 });
	await searchInput.fill(title);

	const row = page.getByTestId("submission-row").filter({ visible: true, hasText: title }).first();
	await expect(row).toBeVisible({ timeout: 10000 });

	await row.getByRole("button").last().click();
	await page.getByRole("menuitem", { name: /View/i }).click();
	await page.waitForURL(/\/admin\/submissions\/[a-f0-9-]+/);

	const url = page.url();
	const match = url.match(/\/admin\/submissions\/([a-f0-9-]+)/);
	if (!match) throw new Error(`Could not extract submission ID from URL: ${url}`);
	return match[1];
}

test.describe("Complete Submission Workflow", () => {
	test("author creates and submits a new submission", async ({ page, testRun }) => {
		test.slow();
		const submissionTitle = `${testRun.testRunId}_E2E Workflow`;
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto("/submissions/new");
		await page.getByLabel("Title").waitFor({ state: "visible", timeout: 30000 });
		const authorCard = page.locator('[data-testid="author-card-0"]');
		await expect(authorCard.getByLabel("First name")).not.toHaveValue("", { timeout: 10000 });

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

		await expect(page.getByText(submissionTitle)).toBeVisible({ timeout: 60000 });
	});

	test("admin assigns reviewer to submission", async ({ page, testRun, cleanup }) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Assign Reviewer Workflow Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);
		await expect(page.getByText("Submitted").first()).toBeVisible();

		await runSubmissionAction(page, "Assign Reviewer");
		await page.getByRole("dialog").waitFor({ state: "visible" });

		await expect(page.getByText(/Available Reviewers/i)).toBeVisible();

		await page.getByPlaceholder("Search by name, email, or affiliation...").fill(REVIEWER_USER.email);
			await expect(page.getByText(REVIEWER_USER.email)).toBeVisible();

		// Close dialog (don't actually assign to preserve test state)
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("button", { name: "Close" }).first().click();
		await dialog.waitFor({ state: "hidden", timeout: 5000 });
	});

	test("admin makes accept decision on submission", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Accept Decision Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);

		await expect(page.getByText(/Awaiting Decision/i).first()).toBeVisible();

		const makeDecisionBtn = page.getByRole("button", { name: /Make Decision/i });
		await makeDecisionBtn.click();
		await page.getByRole("dialog").waitFor({ state: "visible" });

		await page.getByRole("button", { name: /Accept.*publication/i }).click();
		await page.getByLabel(/Internal Reasoning/i).fill("Excellent submission - Accept");
		await page.getByLabel(/Letter to Author/i).fill("Congratulations, your submission has been accepted.");
		await page.getByRole("button", { name: /Submit Decision/i }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 5000 });

		await page.reload();
		await expect(page.getByText(/Accepted/i).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Desk Rejection Workflow", () => {
	test("admin can desk reject a submitted submission", async ({ page, testRun, cleanup }) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Desk Reject Workflow Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);
		await expect(page.getByText("Submitted").first()).toBeVisible();

		await runSubmissionAction(page, "Desk Reject");
		await page.getByRole("dialog").waitFor({ state: "visible" });

		await page.getByLabel(/Reason/i).fill("Out of scope for this conference - E2E test");
		await page.getByRole("button", { name: /Reject Submission/i }).click();

		await waitForDialogToClose(page);

		await page.reload();
		await expect(page.getByText(/Rejected/i).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Desk Acceptance Workflow", () => {
	test("admin can desk accept a submitted submission", async ({ page, testRun, cleanup }) => {
		const { id, title } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Desk Accept Workflow Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);
		await expect(page.getByTestId("submission-status")).toHaveText(/Submitted/i);

		await runSubmissionAction(page, "Desk Accept");
		await page.getByRole("dialog").waitFor({ state: "visible" });

		await page.getByLabel(/Reason/i).fill("Invited speaker - E2E test");
		await page.getByRole("button", { name: /Accept Submission/i }).click();

		await waitForDialogToClose(page);

		await page.reload();
		await expect(page.getByTestId("submission-status")).toHaveText(/Accepted/i, {
			timeout: 10000,
		});
	});
});

test.describe("Reviewer Assignments", () => {
	test("admin can view and manage reviewer assignments", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Manage Assignments Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);
		await expect(page.getByText("Under Review").first()).toBeVisible();

		await runSubmissionAction(page, "Assign Reviewer");
		const dialog = page.getByRole("dialog");
		await dialog.waitFor({ state: "visible" });

		await expect(page.getByText(/Current Reviewers \(/i)).toBeVisible();
		await expect(page.getByText("Available Reviewers", { exact: true })).toBeVisible();
		await expect(page.getByText(REVIEWER_USER.email).first()).toBeVisible();

		await dialog.getByRole("button", { name: "Close" }).first().click();
		await dialog.waitFor({ state: "hidden", timeout: 5000 });
	});

	test("reviewer sees pending assignment", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Pending Assignment Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto("/reviews");
	
		await expect(page.getByText(title).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Status History", () => {
	test("history tab shows status transitions", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Status History Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);

		await page.getByRole("tab", { name: /History/i }).click();

		await expect(page.getByText("Activity History", { exact: true })).toBeVisible();
		await expect(page.getByText(/AWAITING_DECISION|Awaiting Decision/i).first()).toBeVisible();
	});
});

test.describe("Review Display", () => {
	test("admin can view completed reviews", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "View Reviews Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await findSubmissionInAdmin(page, title);

		await page.getByRole("tab", { name: /Reviews/i }).click();

		await expect(page.getByText(/Accept/i).first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Review Form Validation", () => {
	test("reviewer can fill review form with all required fields", async ({ page, testRun, cleanup }) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Review Form Validation Workflow Test",
		});
		cleanup.track(submissionId);

		await loginAs(page, REVIEWER_USER, { clearCookies: true });
		await page.goto("/reviews");
	
		await openReviewFromAssignmentList(page, title);

		await expect(page.locator('[data-slot="card-title"]').filter({ hasText: "Decision" })).toBeVisible({ timeout: 10000 });

		await page.getByRole("button", { name: /Accept Recommends accepting/i }).click();

		const scoreButtons = await page.getByRole("button", { name: "4", exact: true }).all();
		expect(scoreButtons.length).toBe(5); // 4 criteria + confidence
		for (const btn of scoreButtons) {
			await btn.click();
		}

		await expect(page.getByText("High: Expert in this area")).toBeVisible();

		const commentsField = page.getByRole("textbox", { name: "Review Comments" });
		await commentsField.click();
		await commentsField.pressSequentially(
			"This is a detailed review with sufficient content to meet minimum requirements for submission.",
			{ delay: 5 }
		);

		await expect(page.getByRole("button", { name: "Submit Review" })).toBeEnabled();
	});
});
