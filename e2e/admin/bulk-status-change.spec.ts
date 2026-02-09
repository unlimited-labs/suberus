import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
	createSubmission,
	createSubmissionWithReview,
	deleteSubmission,
} from "../helpers/test-db";

test.describe.serial("Admin - Bulk Status Change", () => {
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name.includes("mobile"),
			"Bulk actions require desktop table layout with checkboxes",
		);
	});

	test("should bulk accept submissions in AWAITING_DECISION", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const { submissionId: sub1Id } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Accept A",
			content: "Content for acceptance test",
		});
		const { submissionId: sub2Id } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Accept B",
			content: "Content for acceptance test",
		});

		// Act
		await page.goto("/admin/submissions");
		await page.getByPlaceholder("Search submissions...").fill(testRun.testRunId);
		await expect(
			page.getByRole("cell", { name: `${testRun.testRunId}_Accept A` }),
		).toBeVisible();

		// Select submissions
		const row1 = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Accept A` });
		const row2 = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Accept B` });
		await row1.getByRole("checkbox").check();
		await row2.getByRole("checkbox").check();
		await expect(page.getByText("2 selected")).toBeVisible();

		// Open bulk actions
		const bulkSelect = page
			.getByRole("combobox")
			.filter({ hasText: /Bulk actions/ });
		await bulkSelect.click();
		await page.getByRole("option", { name: /Change status/i }).click();
		await page.getByRole("button", { name: "Apply" }).click();

		// Dialog
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Select "Accepted"
		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: "Accepted", exact: true }).click();

		// Confirm
		await dialog.getByRole("button", { name: "Save" }).click();

		// Assert
		await expect(page.getByText(/updated 2 submission/i)).toBeVisible();

		// Cleanup
		await deleteSubmission(sub1Id);
		await deleteSubmission(sub2Id);
	});

	test("should show errors for invalid status transitions", async ({
		page,
		testRun,
	}) => {
		// Arrange - SUBMITTED cannot transition directly to ACCEPTED
		const { id: subId } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Invalid Trans",
			content: "Content for invalid transition test",
		});

		// Act
		await page.goto("/admin/submissions");
		await page.getByPlaceholder("Search submissions...").fill(testRun.testRunId);
		await expect(
			page.getByRole("cell", { name: `${testRun.testRunId}_Invalid Trans` }),
		).toBeVisible();

		const row = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Invalid Trans` });
		await row.getByRole("checkbox").check();

		const bulkSelect = page
			.getByRole("combobox")
			.filter({ hasText: /Bulk actions/ });
		await bulkSelect.click();
		await page.getByRole("option", { name: /Change status/i }).click();
		await page.getByRole("button", { name: "Apply" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Select "Accepted" — invalid from SUBMITTED
		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: "Accepted", exact: true }).click();
		await dialog.getByRole("button", { name: "Save" }).click();

		// Assert - should show error
		await expect(dialog.getByText(/invalid transition/i)).toBeVisible();

		// Cleanup
		await deleteSubmission(subId);
	});

	test("should bulk reject submissions", async ({ page, testRun }) => {
		// Arrange
		const { submissionId: subId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Reject Me",
			content: "Content for rejection test",
		});

		// Act
		await page.goto("/admin/submissions");
		await page.getByPlaceholder("Search submissions...").fill(testRun.testRunId);
		await expect(
			page.getByRole("cell", { name: `${testRun.testRunId}_Reject Me` }),
		).toBeVisible();

		const row = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Reject Me` });
		await row.getByRole("checkbox").check();

		const bulkSelect = page
			.getByRole("combobox")
			.filter({ hasText: /Bulk actions/ });
		await bulkSelect.click();
		await page.getByRole("option", { name: /Change status/i }).click();
		await page.getByRole("button", { name: "Apply" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Select "Rejected"
		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: "Rejected" }).click();
		await dialog.getByRole("button", { name: "Save" }).click();

		// Assert
		await expect(page.getByText(/updated 1 submission/i)).toBeVisible();

		// Cleanup
		await deleteSubmission(subId);
	});
});
