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
		await page.goto("/admin/submissions");
		// Filter to test submissions
		await page.getByPlaceholder("Search submissions...").fill(testRun.testRunId);
		await expect(
			page.getByRole("cell", { name: `${testRun.testRunId}_Paper 1` }),
		).toBeVisible();

		// Select submissions
		const row1 = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Paper 1` });
		const row2 = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Paper 2` });
		await row1.getByRole("checkbox").check();
		await row2.getByRole("checkbox").check();

		await expect(page.getByText("2 selected")).toBeVisible();

		// Open bulk actions (filter to distinguish from pagination combobox)
		const bulkSelect = page
			.getByRole("combobox")
			.filter({ hasText: /Bulk actions/ });
		await bulkSelect.click();
		await page
			.getByRole("option", { name: /Assign to track/i })
			.click();
		await page.getByRole("button", { name: "Apply" }).click();

		// Dialog should open
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

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
		await page.goto("/admin/submissions");
		await page.getByPlaceholder("Search submissions...").fill(testRun.testRunId);
		await expect(
			page.getByRole("cell", { name: `${testRun.testRunId}_Abstract Paper` }),
		).toBeVisible();

		// Select both
		const abstractRow = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Abstract Paper` });
		const posterRow = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Poster Paper` });
		await abstractRow.getByRole("checkbox").check();
		await posterRow.getByRole("checkbox").check();

		// Open bulk track assignment
		const bulkSelect = page
			.getByRole("combobox")
			.filter({ hasText: /Bulk actions/ });
		await bulkSelect.click();
		await page
			.getByRole("option", { name: /Assign to track/i })
			.click();
		await page.getByRole("button", { name: "Apply" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

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
		await page.goto("/admin/submissions");
		await page.getByPlaceholder("Search submissions...").fill(testRun.testRunId);
		await expect(
			page.getByRole("cell", { name: `${testRun.testRunId}_Clear A` }),
		).toBeVisible();

		// Select submissions
		const row1 = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Clear A` });
		const row2 = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Clear B` });
		await row1.getByRole("checkbox").check();
		await row2.getByRole("checkbox").check();

		// Open bulk track assignment
		const bulkSelect = page
			.getByRole("combobox")
			.filter({ hasText: /Bulk actions/ });
		await bulkSelect.click();
		await page
			.getByRole("option", { name: /Assign to track/i })
			.click();
		await page.getByRole("button", { name: "Apply" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

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
