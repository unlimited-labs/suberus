import { expect } from "@playwright/test";
import { test } from "../helpers/base-fixtures";
import {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithReview,
	createSubmissionWithDecision,
	createActivityLog,
	getTestUserIds,
} from "../helpers/test-db";
import { SubmissionStatus } from "../../src/generated/prisma/enums";

test.describe("Admin - Submission Activity History", () => {
	test("shows status change events in history", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { submissionId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "History Status Test",
		});
		cleanup.track(submissionId);

		await page.goto(`/admin/submissions/${submissionId}`);
		await page
			.locator('[data-testid="submission-status"]')
			.waitFor({ state: "visible", timeout: 10000 });

		await page.getByRole("tab", { name: /History/i }).click();

		await expect(
			page.getByText("Activity History", { exact: true }),
		).toBeVisible();
		await expect(page.getByText("Status changed").first()).toBeVisible();
	});

	test("shows reviewer assigned event", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { adminUserId, reviewerUserId } = await getTestUserIds();
		const { submissionId } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "History Assign Test",
		});
		cleanup.track(submissionId);

		await createActivityLog({
			type: "REVIEW_ASSIGNED",
			submissionId,
			detail: { type: "REVIEW_ASSIGNED", assignmentId: "test" },
			performedBy: adminUserId,
			userId: reviewerUserId,
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await page
			.locator('[data-testid="submission-status"]')
			.waitFor({ state: "visible", timeout: 10000 });
		await page.getByRole("tab", { name: /History/i }).click();

		await expect(page.getByText("Reviewer assigned")).toBeVisible();
	});

	test("shows review submitted event with decision", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { reviewerUserId } = await getTestUserIds();
		const { submissionId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "History Review Test",
		});
		cleanup.track(submissionId);

		await createActivityLog({
			type: "REVIEW_SUBMITTED",
			submissionId,
			detail: { type: "REVIEW_SUBMITTED", decision: "ACCEPT" },
			performedBy: reviewerUserId,
			userId: reviewerUserId,
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await page
			.locator('[data-testid="submission-status"]')
			.waitFor({ state: "visible", timeout: 10000 });
		await page.getByRole("tab", { name: /History/i }).click();

		await expect(page.getByText("Review submitted")).toBeVisible();
		await expect(page.getByText("ACCEPT")).toBeVisible();
	});

	test("shows decision submitted event", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { adminUserId } = await getTestUserIds();
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "History Decision Test",
		});
		cleanup.track(submissionId);

		await createActivityLog({
			type: "DECISION_SUBMITTED",
			submissionId,
			detail: {
				type: "DECISION_SUBMITTED",
				decision: "ACCEPT",
				reasoning: "Strong paper",
			},
			performedBy: adminUserId,
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await page
			.locator('[data-testid="submission-status"]')
			.waitFor({ state: "visible", timeout: 10000 });
		await page.getByRole("tab", { name: /History/i }).click();

		await expect(page.getByText("Decision submitted")).toBeVisible();
	});

	test("shows desk rejected event with reason", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { adminUserId } = await getTestUserIds();
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "History Desk Reject Test",
			status: SubmissionStatus.REJECTED,
		});
		cleanup.track(submissionId);

		await createActivityLog({
			type: "DECISION_DESK_REJECT",
			submissionId,
			detail: {
				type: "DECISION_DESK_REJECT",
				reason: "Out of scope",
			},
			performedBy: adminUserId,
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await page
			.locator('[data-testid="submission-status"]')
			.waitFor({ state: "visible", timeout: 10000 });
		await page.getByRole("tab", { name: /History/i }).click();

		await expect(page.getByText("Desk rejected")).toBeVisible();
		await expect(page.getByText("Out of scope")).toBeVisible();
	});

	test("events appear in chronological order (oldest first)", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { adminUserId, reviewerUserId } = await getTestUserIds();
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "History Order Test",
			status: SubmissionStatus.UNDER_REVIEW,
		});
		cleanup.track(submissionId);

		// Create events with ascending timestamps
		const baseTime = new Date("2025-01-01T10:00:00Z");

		await createActivityLog({
			type: "REVIEW_ASSIGNED",
			submissionId,
			detail: { type: "REVIEW_ASSIGNED", assignmentId: "test" },
			performedBy: adminUserId,
			userId: reviewerUserId,
			createdAt: new Date(baseTime.getTime() + 1000),
		});

		await createActivityLog({
			type: "REVIEW_SUBMITTED",
			submissionId,
			detail: { type: "REVIEW_SUBMITTED", decision: "ACCEPT" },
			performedBy: reviewerUserId,
			userId: reviewerUserId,
			createdAt: new Date(baseTime.getTime() + 2000),
		});

		await page.goto(`/admin/submissions/${submissionId}`);
		await page
			.locator('[data-testid="submission-status"]')
			.waitFor({ state: "visible", timeout: 10000 });
		await page.getByRole("tab", { name: /History/i }).click();

		// Verify both events are visible
		await expect(page.getByText("Reviewer assigned")).toBeVisible();
		await expect(page.getByText("Review submitted")).toBeVisible();

		// Verify chronological order: "Reviewer assigned" appears before "Review submitted"
		const historyContent = await page
			.locator('[role="list"]')
			.first()
			.textContent();
		const assignIdx = historyContent?.indexOf("Reviewer assigned") ?? -1;
		const submitIdx = historyContent?.indexOf("Review submitted") ?? -1;
		expect(assignIdx).toBeGreaterThan(-1);
		expect(submitIdx).toBeGreaterThan(-1);
		expect(assignIdx).toBeLessThan(submitIdx);
	});
});
