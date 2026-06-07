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
		await page.getByRole("option", { name: "50", exact: true }).click();
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

	test("Users: falls back to default when stored value is malformed", async ({
		adminUsersPage,
		page,
	}) => {
		const STORAGE_KEY = "suberus.table.pagination.admin-users";

		await adminUsersPage.goto();
		await adminUsersPage.waitForLoad();

		// Poison the key with a value that fails the schema, then reload.
		await page.evaluate(
			(key) => localStorage.setItem(key, JSON.stringify({ pageSize: "lots" })),
			STORAGE_KEY,
		);
		await page.reload();
		await adminUsersPage.waitForLoad();

		// Schema rejects the bad shape → default 20, no crash.
		await expect(page.getByTestId("rows-per-page")).toHaveText("20");
	});

	test("Submissions: restores page size and resets page index on entry", async ({
		page,
		testRun,
	}) => {
		const STORAGE_KEY = "suberus.table.pagination.admin-submissions";

		// Arrange — seed enough rows that a page size of 10 yields multiple pages.
		await Promise.all(
			Array.from({ length: 12 }, (_, i) =>
				createSubmission({
					testRunId: testRun.testRunId,
					title: `Page Size ${i}`,
					content: "Content for rows-per-page persistence test",
				}),
			),
		);

		await page.goto("/admin/submissions");
		const trigger = page.getByTestId("rows-per-page");
		// Scope to the desktop <table>; each row's testid is also on the (hidden)
		// mobile card, so an unscoped query would double-count.
		const rows = page.locator("table").getByTestId("submission-row");

		// Act — pick 10, then move off page 1.
		await trigger.click();
		await page.getByRole("option", { name: "10", exact: true }).click();
		await expect(trigger).toHaveText("10");
		await expect(rows).toHaveCount(10); // page is full → reflects the new size
		await page.getByRole("button", { name: "Go to next page" }).click();
		await expect(page.getByText(/Page 2 of/)).toBeVisible();

		await expect(async () => {
			const raw = await page.evaluate(
				(key) => localStorage.getItem(key),
				STORAGE_KEY,
			);
			expect(raw).toContain('"pageSize":10');
		}).toPass();

		// Act — reload
		await page.reload();

		// Assert — size restored, but page position reset to 1, rows still capped at 10.
		await expect(page.getByTestId("rows-per-page")).toHaveText("10");
		await expect(page.getByText(/Page 1 of/)).toBeVisible();
		await expect(rows).toHaveCount(10);
	});
});
