import { test, expect } from "../helpers/base-fixtures";
import { waitForDialogToClose } from "../helpers/dialog";
import {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithDecision,
} from "../helpers/test-db";
import {
	EditorDecisionType,
	SubmissionStatus,
} from "../../src/generated/prisma/enums";
import { ADMIN_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";
import {
	expectActionUnavailable,
	runSubmissionAction,
} from "../helpers/submission-actions";

test.describe("Override from Terminal States", () => {
	test("admin can override ACCEPTED submission", async ({ page, testRun, cleanup }) => {
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Override Accepted Test",
			editorDecision: EditorDecisionType.ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Accepted").first()).toBeVisible({ timeout: 10000 });

		await runSubmissionAction(page, "Override Decision");
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.locator("#override-reason").fill("Need to reconsider this decision");
		await page.getByRole("button", { name: "Override", exact: true }).click();

		await waitForDialogToClose(page);
		await page.reload();
		await expect(page.getByText("Awaiting Decision").first()).toBeVisible({ timeout: 10000 });
	});

	test("override dialog shows reasoning textarea", async ({ page, testRun, cleanup }) => {
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Override Dialog Test",
			editorDecision: EditorDecisionType.ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);

		await runSubmissionAction(page, "Override Decision");
		await page.getByRole("dialog").waitFor({ state: "visible" });

		await expect(page.locator("#override-reason")).toBeVisible();
		await expect(
			page.getByText("This will revert the submission to Awaiting Decision")
		).toBeVisible();
	});

	test("admin can override REJECTED submission", async ({ page, testRun, cleanup }) => {
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Override Rejected Test",
			editorDecision: EditorDecisionType.REJECT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Rejected").first()).toBeVisible({ timeout: 10000 });

		await runSubmissionAction(page, "Override Decision");
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.locator("#override-reason").fill("New evidence provided");
		await page.getByRole("button", { name: "Override", exact: true }).click();

		await waitForDialogToClose(page);
		await page.reload();
		await expect(page.getByText("Awaiting Decision").first()).toBeVisible({ timeout: 10000 });
	});

	test("admin can override CONDITIONALLY_ACCEPTED submission", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Override Cond Accept Test",
			editorDecision: EditorDecisionType.CONDITIONALLY_ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);
		await expect(page.getByText("Conditionally Accepted").first()).toBeVisible({ timeout: 10000 });

		await runSubmissionAction(page, "Override Decision");
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.locator("#override-reason").fill("Conditions not met");
		await page.getByRole("button", { name: "Override", exact: true }).click();

		await waitForDialogToClose(page);
		await page.reload();
		await expect(page.getByText("Awaiting Decision").first()).toBeVisible({ timeout: 10000 });
	});
});

test.describe("Override Negative Cases", () => {
	test("override button not shown for SUBMITTED", async ({ page, testRun, cleanup }) => {
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "No Override Submitted Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${id}`);

		await expect(page.getByText("Submitted").first()).toBeVisible({ timeout: 10000 });
		await expectActionUnavailable(page, "Override Decision");
	});

	test("override button not shown for UNDER_REVIEW", async ({ page, testRun, cleanup }) => {
		const { submissionId } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "No Override Under Review Test",
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);

		await expect(page.getByText("Under Review").first()).toBeVisible({ timeout: 10000 });
		await expectActionUnavailable(page, "Override Decision");
	});
});

test.describe("After Override", () => {
	test("admin can make new decision after override", async ({ page, testRun, cleanup }) => {
		test.slow();
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Re-decide After Override Test",
			editorDecision: EditorDecisionType.ACCEPT,
		});
		cleanup.track(submissionId);
		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${submissionId}`);

		await runSubmissionAction(page, "Override Decision");
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.locator("#override-reason").fill("Re-evaluating");
		await page.getByRole("button", { name: "Override", exact: true }).click();
		await waitForDialogToClose(page);
		await page.reload();
		await expect(page.getByText("Awaiting Decision").first()).toBeVisible({ timeout: 10000 });

		await runSubmissionAction(page, "Make Decision");
		await page.getByRole("dialog").waitFor({ state: "visible" });
		await page.getByRole("button", { name: /Accept.*publication/i }).click();
		await page.getByLabel(/Internal Reasoning/i).fill("Re-confirmed acceptance");
		await page.getByLabel(/Letter to Author/i).fill("Your submission is accepted.");
		await page.getByRole("button", { name: "Submit Decision" }).click();
		await waitForDialogToClose(page);

		await page.reload();
		await expect(page.getByText("Accepted").first()).toBeVisible({ timeout: 10000 });
	});
});
