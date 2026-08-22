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
		adminSubmissionsPage,
	}) => {
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

		await adminSubmissionsPage.gotoAndSearch(testRun.testRunId, "Assign Rev A");
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Assign Rev A`);
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Assign Rev B`);
		await expect(page.getByText("2 selected")).toBeVisible();

		const dialog = await adminSubmissionsPage.openBulkAction(/Assign reviewer/i);

		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: /Reviewer/i }).first().click();

		await dialog.getByRole("button", { name: "Assign" }).click();

		await expect(page.getByText(/assigned reviewer to 2 submission/i)).toBeVisible();

		const db = getPrisma();
		const assignments = await db.reviewAssignment.findMany({
			where: { submissionId: { in: [sub1Id, sub2Id] } },
		});
		expect(assignments.length).toBe(2);

		await deleteSubmission(sub1Id);
		await deleteSubmission(sub2Id);
	});

	test("should show error when reviewer already assigned", async ({
		page,
		testRun,
		adminSubmissionsPage,
	}) => {
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

		await adminSubmissionsPage.gotoAndSearch(testRun.testRunId, "Already Assigned");
		await adminSubmissionsPage.selectRow(`${testRun.testRunId}_Already Assigned`);

		const dialog = await adminSubmissionsPage.openBulkAction(/Assign reviewer/i);

		await dialog.getByRole("combobox").click();
		await page.getByRole("option", { name: /Reviewer/i }).first().click();

		await dialog.getByRole("button", { name: "Assign" }).click();

		await expect(dialog.getByText(/already assigned/i)).toBeVisible();

		await deleteSubmission(subId);
	});
});
