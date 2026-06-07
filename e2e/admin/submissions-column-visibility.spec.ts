import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { createSubmission } from "../helpers/test-db";

const STORAGE_KEY = "suberus.table.columns.admin-submissions";

test.describe("Admin Submissions - Column Visibility", () => {
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name.includes("mobile"),
			"Table tests not applicable on mobile (cards instead of table)",
		);
	});

	test("persists hidden column across reload (localStorage)", async ({
		page,
		testRun,
	}) => {
		// Arrange — ensure the table has a row so headers render
		await createSubmission({
			testRunId: testRun.testRunId,
			title: "Column Vis",
			content: "Content for column visibility test",
		});

		await page.goto("/admin/submissions");
		const authorHeader = page
			.getByRole("columnheader")
			.filter({ hasText: "Author" });
		await expect(authorHeader).toBeVisible();

		// Act — hide the Author column
		await page.getByRole("button", { name: "Columns" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Author" }).click();
		await page.keyboard.press("Escape");
		await expect(authorHeader).toBeHidden();

		// Assert — choice is written to localStorage
		await expect(async () => {
			const raw = await page.evaluate(
				(key) => localStorage.getItem(key),
				STORAGE_KEY,
			);
			expect(raw).toContain('"ownerName":false');
		}).toPass();

		// Act — reload
		await page.reload();
		await expect(authorHeader).toBeHidden();

		// Assert — menu reflects the persisted state
		await page.getByRole("button", { name: "Columns" }).click();
		await expect(
			page.getByRole("menuitemcheckbox", { name: "Author" }),
		).toHaveAttribute("aria-checked", "false");
	});
});
