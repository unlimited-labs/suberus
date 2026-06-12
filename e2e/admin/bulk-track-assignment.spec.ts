import { expect } from "@playwright/test";
import { test } from "../admin/fixtures";
import {
	createTrack,
	deleteTrack,
	createSubmission,
	deleteSubmission,
} from "../helpers/test-db";

test.describe.serial("Admin - Bulk Track Assignment", () => {
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name.includes("mobile"),
			"Bulk actions require desktop table layout with checkboxes",
		);
	});

	test("should bulk assign ABSTRACT submissions to track", async ({
		page,
		testRun,
		adminSubmissionsPage,
	}) => {
		// Arrange
		const trackId = await createTrack(testRun.testRunId, "AI Track");
		const { id: sub1Id } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Paper 1",
			content: "Content 1",
		});
		const { id: sub2Id } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Paper 2",
			content: "Content 2",
		});

		// Act
		await adminSubmissionsPage.gotoAndSearch(testRun.testRunId, "Paper 1");
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Paper 1`);
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Paper 2`);
		await expect(page.getByText("2 selected")).toBeVisible();

		const dialog = await adminSubmissionsPage.openBulkAction(/Assign to track/i);

		// Select track in dialog
		await dialog.getByRole("combobox").click();
		await page
			.getByRole("option", { name: `${testRun.testRunId}_AI Track` })
			.click();

		// Confirm
		await dialog.getByRole("button", { name: "Assign" }).click();

		// Assert - success toast
		await expect(page.getByText(/updated 2 submission/i)).toBeVisible();

		// Cleanup
		await deleteSubmission(sub1Id);
		await deleteSubmission(sub2Id);
		await deleteTrack(trackId);
	});

	test("should show error when non-ABSTRACT submissions included", async ({
		page,
		testRun,
		adminSubmissionsPage,
	}) => {
		// Arrange
		const trackId = await createTrack(testRun.testRunId, "Mixed Track");
		const { id: abstractId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Abstract Paper",
			content: "Content",
		});
		const { id: posterId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "POSTER",
			title: "Poster Paper",
			content: "Content",
		});

		// Act
		await adminSubmissionsPage.gotoAndSearch(testRun.testRunId, "Abstract Paper");
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Abstract Paper`);
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Poster Paper`);

		const dialog = await adminSubmissionsPage.openBulkAction(/Assign to track/i);

		// Select track
		await dialog.getByRole("combobox").click();
		await page
			.getByRole("option", { name: `${testRun.testRunId}_Mixed Track` })
			.click();

		// Confirm
		await dialog.getByRole("button", { name: "Assign" }).click();

		// Assert - should show validation error
		await expect(
			dialog.getByText(/not ABSTRACT type/i),
		).toBeVisible();

		// Cleanup
		await deleteSubmission(abstractId);
		await deleteSubmission(posterId);
		await deleteTrack(trackId);
	});

	test("should assign to None to clear tracks", async ({
		page,
		testRun,
		adminSubmissionsPage,
	}) => {
		// Arrange
		const trackId = await createTrack(
			testRun.testRunId,
			"Initial Track",
		);
		const { id: sub1Id } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Clear A",
			content: "Content",
			trackId,
		});
		const { id: sub2Id } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Clear B",
			content: "Content",
			trackId,
		});

		// Act
		await adminSubmissionsPage.gotoAndSearch(testRun.testRunId, "Clear A");
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Clear A`);
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Clear B`);

		const dialog = await adminSubmissionsPage.openBulkAction(/Assign to track/i);

		// Select "None" to clear tracks
		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: "None" }).click();

		// Confirm
		await dialog.getByRole("button", { name: "Assign" }).click();

		// Assert - success toast
		await expect(page.getByText(/updated 2 submission/i)).toBeVisible();

		// Verify in database
		const { getPrisma } = await import("../helpers/test-db");
		const db = getPrisma();
		const subs = await db.submission.findMany({
			where: { id: { in: [sub1Id, sub2Id] } },
		});
		expect(subs.every((s) => s.trackId === null)).toBe(true);

		// Cleanup
		await deleteSubmission(sub1Id);
		await deleteSubmission(sub2Id);
		await deleteTrack(trackId);
	});
});
