import { type Page } from "@playwright/test";
import { test, expect } from "../helpers/base-fixtures";
import {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithDecision,
} from "../helpers/test-db";
import {
	EditorDecisionType,
	SubmissionStatus,
} from "../../src/generated/prisma/enums";

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

test.describe("Override from Terminal States", () => {
	test("admin can override ACCEPTED submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Override Accepted Test",
			editorDecision: EditorDecisionType.ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER);
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Accepted").first()).toBeVisible({ timeout: 10000 });

		// Act
		await page.getByRole("button", { name: "Override Decision" }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.locator("#override-reason").fill("Need to reconsider this decision");
		await page.getByRole("button", { name: "Override", exact: true }).click();

		// Assert
		await Promise.race([
			page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
			page.locator("[data-sonner-toast]").waitFor({ state: "visible", timeout: 15000 }),
		]);
		await page.reload();
		await expect(page.getByText("Awaiting Decision").first()).toBeVisible({ timeout: 10000 });
	});

	test("override dialog shows reasoning textarea", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Override Dialog Test",
			editorDecision: EditorDecisionType.ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER);
		await page.goto(`/admin/submissions/${submissionId}`);

		// Act
		await page.getByRole("button", { name: "Override Decision" }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });

		// Assert
		await expect(page.locator("#override-reason")).toBeVisible();
		await expect(
			page.getByText("This will revert the submission to Awaiting Decision")
		).toBeVisible();
	});

	test("admin can override REJECTED submission", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Override Rejected Test",
			editorDecision: EditorDecisionType.REJECT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER);
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Rejected").first()).toBeVisible({ timeout: 10000 });

		// Act
		await page.getByRole("button", { name: "Override Decision" }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.locator("#override-reason").fill("New evidence provided");
		await page.getByRole("button", { name: "Override", exact: true }).click();

		// Assert
		await Promise.race([
			page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
			page.locator("[data-sonner-toast]").waitFor({ state: "visible", timeout: 15000 }),
		]);
		await page.reload();
		await expect(page.getByText("Awaiting Decision").first()).toBeVisible({ timeout: 10000 });
	});

	test("admin can override CONDITIONALLY_ACCEPTED submission", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Override Cond Accept Test",
			editorDecision: EditorDecisionType.CONDITIONALLY_ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER);
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Conditionally Accepted").first()).toBeVisible({ timeout: 10000 });

		// Act
		await page.getByRole("button", { name: "Override Decision" }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.locator("#override-reason").fill("Conditions not met");
		await page.getByRole("button", { name: "Override", exact: true }).click();

		// Assert
		await Promise.race([
			page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
			page.locator("[data-sonner-toast]").waitFor({ state: "visible", timeout: 15000 }),
		]);
		await page.reload();
		await expect(page.getByText("Awaiting Decision").first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Override Negative Cases", () => {
	test("override button not shown for SUBMITTED", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "No Override Submitted Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, ADMIN_USER);
		await page.goto(`/admin/submissions/${id}`);

		// Assert
		await expect(page.getByText("Submitted").first()).toBeVisible({ timeout: 10000 });
		await expect(
			page.getByRole("button", { name: "Override Decision" })
		).not.toBeVisible();
	});

	test("override button not shown for UNDER_REVIEW", async ({ page, testRun, cleanup }) => {
		// Arrange
		const { submissionId } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "No Override Under Review Test",
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER);
		await page.goto(`/admin/submissions/${submissionId}`);

		// Assert
		await expect(page.getByText("Under Review").first()).toBeVisible({ timeout: 10000 });
		await expect(
			page.getByRole("button", { name: "Override Decision" })
		).not.toBeVisible();
	});
});

test.describe("After Override", () => {
	test("admin can make new decision after override", async ({ page, testRun, cleanup }) => {
		test.slow();
		// Arrange - create accepted, then override
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Re-decide After Override Test",
			editorDecision: EditorDecisionType.ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER);
		await page.goto(`/admin/submissions/${submissionId}`);

		// Override
		await page.getByRole("button", { name: "Override Decision" }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.locator("#override-reason").fill("Re-evaluating");
		await page.getByRole("button", { name: "Override", exact: true }).click();
		await Promise.race([
			page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
			page.locator("[data-sonner-toast]").waitFor({ state: "visible", timeout: 15000 }),
		]);
		await page.reload();
		await expect(page.getByText("Awaiting Decision").first()).toBeVisible({ timeout: 10000 });

		// Act - make new decision
		await page.getByRole("button", { name: "Make Decision" }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.getByRole("button", { name: /Accept.*publication/i }).click();
		await page.getByLabel(/Internal Reasoning/i).fill("Re-confirmed acceptance");
		await page.getByLabel(/Letter to Author/i).fill("Your submission is accepted.");
		await page.getByRole("button", { name: "Submit Decision" }).click();

		// Assert
		await page.reload();
		await expect(page.getByText("Accepted").first()).toBeVisible({ timeout: 10000 });
	});
});
