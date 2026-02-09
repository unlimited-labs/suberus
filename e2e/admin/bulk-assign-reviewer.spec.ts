import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
	createSubmission,
	deleteSubmission,
	getPrisma,
} from "../helpers/test-db";

test.describe.serial("Admin - Bulk Assign Reviewer", () => {
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name.includes("mobile"),
			"Bulk actions require desktop table layout with checkboxes",
		);
	});

	test("should bulk assign reviewer to submissions", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const { id: sub1Id } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Assign Rev A",
			content: "Content",
		});
		const { id: sub2Id } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Assign Rev B",
			content: "Content",
		});

		// Act
		await page.goto("/admin/submissions");
		await page.getByPlaceholder("Search submissions...").fill(testRun.testRunId);
		await expect(
			page.getByRole("cell", { name: `${testRun.testRunId}_Assign Rev A` }),
		).toBeVisible();

		// Select both
		const row1 = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Assign Rev A` });
		const row2 = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Assign Rev B` });
		await row1.getByRole("checkbox").check();
		await row2.getByRole("checkbox").check();
		await expect(page.getByText("2 selected")).toBeVisible();

		// Open bulk actions
		const bulkSelect = page
			.getByRole("combobox")
			.filter({ hasText: /Bulk actions/ });
		await bulkSelect.click();
		await page.getByRole("option", { name: /Assign reviewer/i }).click();
		await page.getByRole("button", { name: "Apply" }).click();

		// Dialog
		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Select the seeded reviewer (Reviewer User)
		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: /Reviewer/i }).first().click();

		// Confirm
		await dialog.getByRole("button", { name: "Assign" }).click();

		// Assert
		await expect(page.getByText(/assigned reviewer to 2 submission/i)).toBeVisible();

		// Verify DB - assignments created
		const db = getPrisma();
		const assignments = await db.reviewAssignment.findMany({
			where: { submissionId: { in: [sub1Id, sub2Id] } },
		});
		expect(assignments.length).toBe(2);

		// Cleanup
		await deleteSubmission(sub1Id);
		await deleteSubmission(sub2Id);
	});

	test("should show error when reviewer already assigned", async ({
		page,
		testRun,
	}) => {
		// Arrange - create submission and pre-assign the reviewer
		const { id: subId } = await createSubmission({
			testRunId: testRun.testRunId,
			type: "ABSTRACT",
			title: "Already Assigned",
			content: "Content",
		});

		const db = getPrisma();
		const reviewer = await db.user.findFirst({
			where: { email: "reviewer@e2e.local" },
		});

		// Pre-assign the reviewer
		await db.reviewAssignment.create({
			data: {
				submissionId: subId,
				reviewerId: reviewer!.id,
				round: 1,
				status: "PENDING",
				deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				assignedBy: reviewer!.id,
				orderIndex: 0,
			},
		});

		// Act
		await page.goto("/admin/submissions");
		await page.getByPlaceholder("Search submissions...").fill(testRun.testRunId);
		await expect(
			page.getByRole("cell", { name: `${testRun.testRunId}_Already Assigned` }),
		).toBeVisible();

		const row = page
			.locator("tr")
			.filter({ hasText: `${testRun.testRunId}_Already Assigned` });
		await row.getByRole("checkbox").check();

		const bulkSelect = page
			.getByRole("combobox")
			.filter({ hasText: /Bulk actions/ });
		await bulkSelect.click();
		await page.getByRole("option", { name: /Assign reviewer/i }).click();
		await page.getByRole("button", { name: "Apply" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Select the same reviewer
		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: /Reviewer/i }).first().click();

		await dialog.getByRole("button", { name: "Assign" }).click();

		// Assert - error about already assigned
		await expect(dialog.getByText(/already assigned/i)).toBeVisible();

		// Cleanup
		await deleteSubmission(subId);
	});
});
