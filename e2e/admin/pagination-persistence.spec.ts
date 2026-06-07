import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { createSubmission } from "../helpers/test-db";

// Persisted "Rows per page" preference (localStorage), restored on entry.
// Desktop only — mobile renders cards, but the pagination control still mounts;
// we keep these on desktop to match the rest of the admin-table suite.
test.describe("Admin tables - rows-per-page persistence", () => {
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name.includes("mobile"),
			"Table tests not applicable on mobile (cards instead of table)",
		);
	});

	test("Users: persists rows-per-page across reload (localStorage)", async ({
		adminUsersPage,
		page,
	}) => {
		const STORAGE_KEY = "suberus.table.pagination.admin-users";

		// Arrange
		await adminUsersPage.goto();
		await adminUsersPage.waitForLoad();

		const trigger = page.getByTestId("rows-per-page");
		await expect(trigger).toHaveText("20");

		// Act — pick 50
		await trigger.click();
		await page.getByRole("option", { name: "50" }).click();
		await expect(trigger).toHaveText("50");

		// Assert — written to localStorage (await to avoid the write race)
		await expect(async () => {
			const raw = await page.evaluate(
				(key) => localStorage.getItem(key),
				STORAGE_KEY,
			);
			expect(raw).toContain('"pageSize":50');
		}).toPass();

		// Act — reload
		await page.reload();
		await adminUsersPage.waitForLoad();

		// Assert — restored on entry
		await expect(page.getByTestId("rows-per-page")).toHaveText("50");
	});

	test("Submissions: persists rows-per-page across reload (localStorage)", async ({
		page,
		testRun,
	}) => {
		const STORAGE_KEY = "suberus.table.pagination.admin-submissions";

		// Arrange — a row so the table (and pagination) renders
		await createSubmission({
			testRunId: testRun.testRunId,
			title: "Page Size",
			content: "Content for rows-per-page persistence test",
		});

		await page.goto("/admin/submissions");
		const trigger = page.getByTestId("rows-per-page");
		await expect(trigger).toHaveText("20");

		// Act — pick 50
		await trigger.click();
		await page.getByRole("option", { name: "50" }).click();
		await expect(trigger).toHaveText("50");

		// Assert — written to localStorage
		await expect(async () => {
			const raw = await page.evaluate(
				(key) => localStorage.getItem(key),
				STORAGE_KEY,
			);
			expect(raw).toContain('"pageSize":50');
		}).toPass();

		// Act — reload
		await page.reload();

		// Assert — restored on entry
		await expect(page.getByTestId("rows-per-page")).toHaveText("50");
	});
});
