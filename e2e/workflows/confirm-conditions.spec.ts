import { test, expect } from "../helpers/base-fixtures";
import { createSubmissionWithDecision } from "../helpers/test-db";
import { EditorDecisionType } from "../../src/generated/prisma/enums";
import { ADMIN_USER, TEST_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";

test.describe("Confirm Conditions Met", () => {
	test("admin can confirm conditions on CONDITIONALLY_ACCEPTED submission", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Confirm Conditions Test",
			editorDecision: EditorDecisionType.CONDITIONALLY_ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Conditionally Accepted").first()).toBeVisible({ timeout: 10000 });

		// Act
		await page.getByRole("button", { name: "Confirm Conditions Met" }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.locator("#confirm-conditions-reason").fill("Author addressed all minor conditions");
		await page.getByRole("button", { name: "Confirm Accepted" }).click();

		// Assert
		await Promise.race([
			page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
			page.locator("[data-sonner-toast]").waitFor({ state: "visible", timeout: 15000 }),
		]);
		await page.reload();
		await expect(page.locator('[data-testid="submission-status"]')).toHaveText(/Accepted/i, { timeout: 10000 });
	});

	test("confirm conditions dialog shows reasoning textarea", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Confirm Dialog Test",
			editorDecision: EditorDecisionType.CONDITIONALLY_ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);

		// Act
		await page.getByRole("button", { name: "Confirm Conditions Met" }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });

		// Assert
		await expect(page.locator("#confirm-conditions-reason")).toBeVisible();
		await expect(
			page.getByText("This will promote the submission from Conditionally Accepted to Accepted"),
		).toBeVisible();
	});

	test("author can upload a revised version while CONDITIONALLY_ACCEPTED (no new round)", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange — conditionally accepted abstract owned by the test author
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Conditional Revision Upload Test",
			editorDecision: EditorDecisionType.CONDITIONALLY_ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${submissionId}`);

		// Act — open the revise flow from the conditional-accept action
		await page
			.getByRole("button", { name: "Upload Revised Version" })
			.click();
		await expect(page).toHaveURL(new RegExp(`/submissions/${submissionId}/revise`));
		await expect(
			page.getByRole("heading", { name: "Upload Revised Version" }),
		).toBeVisible();

		await page
			.locator("#content")
			.fill("Revised abstract content addressing the minor conditions. ".repeat(5));
		await page.locator("#comment").fill("Fixed typos per reviewer notes");
		await page.getByRole("button", { name: "Upload Revised Version" }).click();

		// Assert — back on detail, status unchanged (action still offered)
		await expect(page).toHaveURL(new RegExp(`/submissions/${submissionId}$`), {
			timeout: 15000,
		});
		await expect(
			page.getByRole("button", { name: "Upload Revised Version" }),
		).toBeVisible({ timeout: 10000 });

		// Editor sees the upload in activity history and can still confirm conditions
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Conditionally Accepted").first()).toBeVisible({
			timeout: 10000,
		});
		await page.getByRole("tab", { name: "History" }).click();
		await expect(
			page.getByText("Revised version uploaded").first(),
		).toBeVisible({ timeout: 10000 });

		await page.getByRole("button", { name: "Confirm Conditions Met" }).click();
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page
			.locator("#confirm-conditions-reason")
			.fill("Revised version resolves the conditions");
		await page.getByRole("button", { name: "Confirm Accepted" }).click();
		await Promise.race([
			page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
			page
				.locator("[data-sonner-toast]")
				.waitFor({ state: "visible", timeout: 15000 }),
		]);
		await page.reload();
		await expect(
			page.locator('[data-testid="submission-status"]'),
		).toHaveText(/Accepted/i, { timeout: 10000 });
	});

	test("confirm conditions button not shown for ACCEPTED", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "No Confirm On Accepted Test",
			editorDecision: EditorDecisionType.ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Accepted").first()).toBeVisible({ timeout: 10000 });

		// Assert
		await expect(
			page.getByRole("button", { name: "Confirm Conditions Met" }),
		).not.toBeVisible();
	});

	test("confirm conditions button not shown for REJECTED", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "No Confirm On Rejected Test",
			editorDecision: EditorDecisionType.REJECT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Rejected").first()).toBeVisible({ timeout: 10000 });

		// Assert
		await expect(
			page.getByRole("button", { name: "Confirm Conditions Met" }),
		).not.toBeVisible();
	});
});
