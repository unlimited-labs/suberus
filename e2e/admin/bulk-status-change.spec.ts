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
		adminSubmissionsPage,
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
		await adminSubmissionsPage.gotoAndSearch(testRun.testRunId, "Accept A");
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Accept A`);
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Accept B`);
		await expect(page.getByText("2 selected")).toBeVisible();

		const dialog = await adminSubmissionsPage.openBulkAction(/Change status/i);

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
		adminSubmissionsPage,
	}) => {
		// Arrange - SUBMITTED cannot transition directly to ACCEPTED
		const { id: subId } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Invalid Trans",
			content: "Content for invalid transition test",
		});

		// Act
		await adminSubmissionsPage.gotoAndSearch(testRun.testRunId, "Invalid Trans");
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Invalid Trans`);

		const dialog = await adminSubmissionsPage.openBulkAction(/Change status/i);

		// Select "Accepted" — invalid from SUBMITTED
		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: "Accepted", exact: true }).click();
		await dialog.getByRole("button", { name: "Save" }).click();

		// Assert - should show error
		await expect(dialog.getByText(/invalid transition/i)).toBeVisible();

		// Cleanup
		await deleteSubmission(subId);
	});

	test("should bulk reject submissions", async ({ page, testRun, adminSubmissionsPage }) => {
		// Arrange
		const { submissionId: subId } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Reject Me",
			content: "Content for rejection test",
		});

		// Act
		await adminSubmissionsPage.gotoAndSearch(testRun.testRunId, "Reject Me");
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Reject Me`);

		const dialog = await adminSubmissionsPage.openBulkAction(/Change status/i);

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
