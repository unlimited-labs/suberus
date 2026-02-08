import { type Page } from "@playwright/test";
import { test, expect } from "../helpers/base-fixtures";
import {
	createSubmission,
	createSubmissionWithAssignment,
	getAssignmentStatus,
} from "../helpers/test-db";
import { AssignmentStatus, SubmissionStatus } from "../../src/generated/prisma/enums";

// Test credentials
const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
};

const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
};

async function loginAs(page: Page, user: { email: string; password: string }) {
	await page.context().clearCookies();
	await page.goto("/login");
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 30000 });
	await page.getByLabel("E-mail").fill(user.email);
	const passwordInput = page.getByLabel("Password");
	await passwordInput.fill(user.password);
	await passwordInput.press("Enter");
	await page.waitForURL("/", { timeout: 30000 });
}

test.describe("Author Withdrawal", () => {
	test("author withdraws SUBMITTED submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Withdraw Submitted Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER);
		await page.goto(`/submissions/${id}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();

		// Assert
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Withdrawn", { timeout: 10000 });
	});

	test("author withdraws UNDER_REVIEW submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Withdraw Under Review Test",
		});
		cleanup.track(submissionId);
		await loginAs(page, TEST_USER);
		await page.goto(`/submissions/${submissionId}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();

		// Assert
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Withdrawn", { timeout: 10000 });
	});

	test("withdrawn submission hides action buttons", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Withdraw Actions Hidden Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER);
		await page.goto(`/submissions/${id}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });

		// Assert - no action buttons after withdrawal
		await expect(page.getByRole("button", { name: "Edit Submission" })).not.toBeVisible();
		await expect(page.getByRole("button", { name: "Withdraw Submission" })).not.toBeVisible();
	});

	test("withdrawal cancels active reviewer assignments", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId, assignmentId } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Withdraw Cancels Assignments Test",
		});
		cleanup.track(submissionId);
		await loginAs(page, TEST_USER);
		await page.goto(`/submissions/${submissionId}`);

		// Act
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });

		// Assert - assignment status should be CANCELLED
		const status = await getAssignmentStatus(assignmentId);
		expect(status).toBe(AssignmentStatus.CANCELLED);
	});
});

test.describe("Withdrawal + Admin View", () => {
	test("admin sees withdrawn submission with correct status", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange - author withdraws
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Admin Sees Withdrawn Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER);
		await page.goto(`/submissions/${id}`);
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });

		// Act - admin views in admin panel
		await loginAs(page, ADMIN_USER);
		await page.goto(`/admin/submissions/${id}`);

		// Assert
		await expect(page.getByText("Withdrawn").first()).toBeVisible({ timeout: 10000 });
	});
});
