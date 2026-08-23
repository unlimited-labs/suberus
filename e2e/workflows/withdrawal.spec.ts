import { test, expect } from "../helpers/base-fixtures";
import {
	createSubmission,
	createSubmissionWithAssignment,
	getAssignmentStatus,
} from "../helpers/test-db";
import { AssignmentStatus, SubmissionStatus } from "../../src/generated/prisma/enums";
import { TEST_USER, ADMIN_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";

test.describe("Author Withdrawal", () => {
	test("author withdraws SUBMITTED submission", async ({ page, testRun, cleanup }) => {
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Withdraw Submitted Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${id}`);

		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();

		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Withdrawn", { timeout: 10000 });
	});

	test("author withdraws UNDER_REVIEW submission", async ({ page, testRun, cleanup }) => {
		const { submissionId } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Withdraw Under Review Test",
		});
		cleanup.track(submissionId);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${submissionId}`);

		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();

		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
		await expect(page.locator('[data-testid="submission-status"]').first()).toContainText("Withdrawn", { timeout: 10000 });
	});

	test("withdrawn submission hides action buttons", async ({ page, testRun, cleanup }) => {
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Withdraw Actions Hidden Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${id}`);

		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });

		// Scoped to the page body: the just-closed confirm dialog keeps its own
		// "Withdraw Submission" button in the DOM, which trips strict mode.
		const actions = page.getByRole("main");
		await expect(actions.getByRole("button", { name: "Edit Submission" })).not.toBeVisible();
		await expect(actions.getByRole("button", { name: "Withdraw Submission" })).not.toBeVisible();
	});

	test("withdrawal cancels active reviewer assignments", async ({ page, testRun, cleanup }) => {
		const { submissionId, assignmentId } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Withdraw Cancels Assignments Test",
		});
		cleanup.track(submissionId);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${submissionId}`);

		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });

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
		const { id } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Admin Sees Withdrawn Test",
			status: SubmissionStatus.SUBMITTED,
		});
		cleanup.track(id);
		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto(`/submissions/${id}`);
		await page.getByRole("button", { name: "Withdraw Submission" }).click();
		await page.locator("[role=dialog]").getByRole("button", { name: "Withdraw Submission" }).click();
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });

		await loginAs(page, ADMIN_USER, { clearCookies: true });
		await page.goto(`/admin/submissions/${id}`);

		await expect(page.getByText("Withdrawn").first()).toBeVisible({ timeout: 10000 });
	});
});
