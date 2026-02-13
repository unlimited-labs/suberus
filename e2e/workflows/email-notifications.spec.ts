import { type Page } from "@playwright/test";
import { test, expect } from "../helpers/base-fixtures";
import {
	createSubmission,
	createSubmissionWithReview,
} from "../helpers/test-db";
import { SubmissionStatus } from "../../src/generated/prisma/enums";
import { clearMailpitForAddress, waitForEmail, getMailpitMessage } from "../helpers/mailpit";
import { TEST_USER, ADMIN_USER, REVIEWER_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";

async function addKeyword(page: Page, keyword: string) {
	const keywordInput = page.locator("input.min-w-\\[120px\\]");
	await expect(keywordInput).toBeVisible();
	await keywordInput.fill(keyword);
	await keywordInput.press("Enter");
	await expect(page.getByText(keyword, { exact: true })).toBeVisible();
}

// Email tests must run serially: they share Mailpit inbox and clearMailpitForAddress
// deletes all emails for an address, which interferes with concurrent tests.
test.describe.configure({ mode: "serial" });

test.describe("Submission Emails", () => {
	test("submission confirmation email sent on new submission", async ({
		page,
		testRun,
	}) => {
		test.slow();
		// Arrange
		await clearMailpitForAddress(TEST_USER.email);
		const submissionTitle = `${testRun.testRunId}_Email Confirm Test`;
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto("/submissions/new");
		await page.getByLabel("Title").waitFor({ state: "visible", timeout: 30000 });

		// Act
		await page.getByRole("button", { name: "Oral Presentation" }).click();

		// Wait for session auto-fill to populate author data
		const authorCard = page.locator('[data-testid="author-card-0"]');
		await expect(authorCard.getByLabel("First name")).not.toBeEmpty({ timeout: 15000 });

		await page.getByLabel("Title").fill(submissionTitle);
		await page.getByLabel("Abstract").fill(
			"This is a comprehensive test submission for email notification testing. " +
				"The purpose is to validate that submission confirmation emails are sent correctly. " +
				"This abstract discusses methodology and results of the testing approach in detail. " +
				"The testing framework ensures all components function as expected in production. " +
				"Additional context is provided here to meet minimum character requirements. " +
				"More content added here to ensure we pass all validation checks successfully. " +
				"The notification system is a critical part of the submission workflow pipeline."
		);

		const affiliationInput = authorCard.getByLabel("Affiliation");
		await affiliationInput.fill("Test University");
		const affiliationOption = page.getByRole("option").filter({ hasText: "Test University" }).first();
		await affiliationOption.waitFor({ state: "visible", timeout: 10000 });
		await affiliationOption.click();
		await expect(affiliationInput).toHaveValue("Test University", { timeout: 5000 });

		await addKeyword(page, "email-test");
		await addKeyword(page, "notification");
		await addKeyword(page, "e2e-verify");

		await page.getByRole("button", { name: "Submit" }).click();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 60000 });

		// Assert
		const email = await waitForEmail(TEST_USER.email, "Submission Received", 45000);
		expect(email).not.toBeNull();

		// Assert email contains submission URL, not "Submission ID:"
		const emailDetails = await getMailpitMessage(email!.ID);
		expect(emailDetails).not.toBeNull();
		expect(emailDetails!.Text).toMatch(/\/submissions\/[a-f0-9-]+/);
		expect(emailDetails!.Text).not.toContain("Submission ID:");
	});

	test("draft submission does NOT send email", async ({
		page,
		testRun,
	}) => {
		test.slow();
		// Arrange
		await clearMailpitForAddress(TEST_USER.email);
		const submissionTitle = `${testRun.testRunId}_Draft No Email Test`;
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto("/submissions/new");
		await page.getByLabel("Title").waitFor({ state: "visible", timeout: 30000 });

		// Act - save as draft
		await page.getByRole("button", { name: "Oral Presentation" }).click();

		// Wait for session auto-fill to populate author data
		const authorCard = page.locator('[data-testid="author-card-0"]');
		await expect(authorCard.getByLabel("First name")).not.toBeEmpty({ timeout: 15000 });

		await page.getByLabel("Title").fill(submissionTitle);
		await page.getByLabel("Abstract").fill(
			"This is a comprehensive test submission for draft email testing purposes. " +
				"The purpose is to validate that draft saves do NOT send any emails to users. " +
				"This abstract discusses methodology and results of the testing approach in detail. " +
				"The testing framework ensures all components function as expected in production. " +
				"Additional context is provided here to meet minimum character requirements. " +
				"More content added here to ensure we pass all validation checks successfully. " +
				"The draft save mechanism should silently persist without triggering notifications."
		);

		const affiliationInput2 = authorCard.getByLabel("Affiliation");
		await affiliationInput2.fill("Test University");
		const affiliationOption2 = page.getByRole("option").filter({ hasText: "Test University" }).first();
		await affiliationOption2.waitFor({ state: "visible", timeout: 10000 });
		await affiliationOption2.click();
		await expect(affiliationInput2).toHaveValue("Test University", { timeout: 5000 });

		await addKeyword(page, "draft-email-test");
		await addKeyword(page, "no-notify");
		await addKeyword(page, "e2e-draft");

		await page.getByRole("button", { name: "Save Draft" }).click();
		await page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 60000 });

		// Assert - wait briefly then verify no email with this draft's title
		await page.waitForTimeout(3000);
		const email = await waitForEmail(TEST_USER.email, submissionTitle, 3000);
		expect(email).toBeNull();
	});
});

test.describe("Workflow Emails", () => {
	test("withdrawal email sent to author", async ({ page, testRun, cleanup }) => {
		test.slow();
		// Arrange
		await clearMailpitForAddress(TEST_USER.email);
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Withdrawal Email Test",
			status: SubmissionStatus.SUBMITTED,
			authorData: { firstName: "Test", lastName: "User", email: TEST_USER.email },
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${id}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });

		// Assert
		const email = await waitForEmail(TEST_USER.email, "Submission Withdrawn", 30000);
		expect(email).not.toBeNull();
	});

	test("reviewer assignment email sent", async ({ page, testRun, cleanup }) => {
		// Arrange
		await clearMailpitForAddress(REVIEWER_USER.email);
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Reviewer Email Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${id}`);
		await expect(page.getByText("Submitted").first()).toBeVisible({ timeout: 10000 });

		// Act - assign reviewer
		await page.getByRole("button", { name: /Assign Reviewer/i }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.getByPlaceholder("Search by name, email, or affiliation...").fill(REVIEWER_USER.email);
		const reviewerRow = page.locator("div").filter({ hasText: REVIEWER_USER.email }).first();
		await reviewerRow.getByRole("button", { name: "Assign" }).click();
		await expect(page.getByText(/Current Reviewers/i)).toBeVisible({ timeout: 10000 });

		// Assert
		const email = await waitForEmail(REVIEWER_USER.email, "New Review Assignment", 30000);
		expect(email).not.toBeNull();

		const emailDetails = await getMailpitMessage(email!.ID);
		expect(emailDetails).not.toBeNull();
		expect(emailDetails!.Text).toMatch(/\/reviews\/[a-f0-9-]+/);
	});

	test("decision email sent on accept", async ({ page, testRun, cleanup }) => {
		test.slow();
		// Arrange
		await clearMailpitForAddress(TEST_USER.email);
		const { submissionId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Accept Email Test",
			authorData: { firstName: "Test", lastName: "User", email: TEST_USER.email },
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText(/Awaiting Decision/i).first()).toBeVisible({ timeout: 10000 });

		// Act
		await page.getByRole("button", { name: /Make Decision/i }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.getByRole("button", { name: /Accept.*publication/i }).click();
		await page.getByLabel(/Internal Reasoning/i).fill("Excellent work");
		await page.getByLabel(/Letter to Author/i).fill("Congratulations, accepted.");
		await page.getByRole("button", { name: /Submit Decision/i }).click();

		// Assert
		const email = await waitForEmail(TEST_USER.email, "Submission Accepted", 30000);
		expect(email).not.toBeNull();

		const emailDetails = await getMailpitMessage(email!.ID);
		expect(emailDetails).not.toBeNull();
		expect(emailDetails!.Text).toMatch(/\/submissions\/[a-f0-9-]+/);
	});

	test("decision email sent on desk reject", async ({ page, testRun, cleanup }) => {
		// Arrange
		await clearMailpitForAddress(TEST_USER.email);
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Desk Reject Email Test",
			status: SubmissionStatus.SUBMITTED,
			authorData: { firstName: "Test", lastName: "User", email: TEST_USER.email },
		});
		cleanup.track(id);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${id}`);
		await expect(page.getByText("Submitted").first()).toBeVisible({ timeout: 10000 });

		// Act
		await page.getByRole("button", { name: /Desk Reject/i }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.getByLabel(/Reason/i).fill("Out of scope - E2E email test");
		await page.getByRole("button", { name: /Reject Submission/i }).click();
		await Promise.race([
			page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
			page.locator("[data-sonner-toast]").waitFor({ state: "visible", timeout: 15000 }),
		]);

		// Assert
		const email = await waitForEmail(TEST_USER.email, "Submission Decision", 30000);
		expect(email).not.toBeNull();
	});
});
