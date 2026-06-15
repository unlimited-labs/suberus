import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { createSubmission } from "../helpers/test-db";

test.describe("Admin Submissions - Search", () => {
	test("typing in the search box filters the table by title", async ({
		page,
		testRun,
	}) => {
		const prefix = testRun.testRunId;

		// Arrange — two submissions with distinct titles in this test run.
		await createSubmission({ testRunId: prefix, title: "Alpha Research" });
		await createSubmission({ testRunId: prefix, title: "Beta Study" });

		await page.goto("/admin/submissions");

		const search = page.getByTestId("data-table-search");
		// Both desktop (<tr>) and mobile (<div>) layouts render in the DOM under
		// the same testid (toggled via CSS), so scope to the visible one.
		const alphaRow = page
			.getByTestId("submission-row")
			.filter({ visible: true, hasText: "Alpha Research" });
		const betaRow = page
			.getByTestId("submission-row")
			.filter({ visible: true, hasText: "Beta Study" });

		// Narrow to this run — both rows present.
		await search.fill(prefix);
		// Guards the "text doesn't type" symptom: the input must keep the value.
		await expect(search).toHaveValue(prefix);
		await expect(alphaRow).toBeVisible();
		await expect(betaRow).toBeVisible();

		// Refine to a single title — guards the "table doesn't filter" symptom.
		await search.fill(`${prefix}_Alpha`);
		await expect(search).toHaveValue(`${prefix}_Alpha`);
		await expect(alphaRow).toBeVisible();
		await expect(betaRow).toBeHidden();

		// Clearing the search restores the full (run-scoped) set.
		await search.clear();
		await expect(search).toHaveValue("");
		await search.fill(prefix);
		await expect(alphaRow).toBeVisible();
		await expect(betaRow).toBeVisible();
	});
});
