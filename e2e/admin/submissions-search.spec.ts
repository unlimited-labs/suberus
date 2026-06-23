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

	test("the search box also matches author name and email", async ({
		page,
		testRun,
	}) => {
		const prefix = testRun.testRunId;

		// Author name/email carry the run id so the search term stays run-scoped.
		await createSubmission({
			testRunId: prefix,
			title: "By Hopper",
			authorData: {
				firstName: "Grace",
				lastName: `Hopper${prefix}`,
				email: `grace.${prefix}@navy.mil`,
			},
		});
		await createSubmission({
			testRunId: prefix,
			title: "By Turing",
			authorData: {
				firstName: "Alan",
				lastName: `Turing${prefix}`,
				email: `alan.${prefix}@bletchley.uk`,
			},
		});

		await page.goto("/admin/submissions");

		const search = page.getByTestId("data-table-search");
		const hopperRow = page
			.getByTestId("submission-row")
			.filter({ visible: true, hasText: `Hopper${prefix}` });
		const turingRow = page
			.getByTestId("submission-row")
			.filter({ visible: true, hasText: `Turing${prefix}` });

		// Match by author name — only Hopper's submission remains.
		await search.fill(`Hopper${prefix}`);
		await expect(search).toHaveValue(`Hopper${prefix}`);
		await expect(hopperRow).toBeVisible();
		await expect(turingRow).toBeHidden();

		// Match by author email — only Turing's submission remains.
		await search.fill(`alan.${prefix}@`);
		await expect(hopperRow).toBeHidden();
		await expect(turingRow).toBeVisible();
	});
});

test.describe("Admin Submissions - Author column filter", () => {
	test.beforeEach(({}, testInfo) => {
		test.skip(
			testInfo.project.name.includes("mobile"),
			"Per-column header filter is desktop-only (cards have no headers)",
		);
	});

	test("the Author column popover filters by name or email", async ({
		page,
		testRun,
	}) => {
		const prefix = testRun.testRunId;

		await createSubmission({
			testRunId: prefix,
			title: "Col Hopper",
			authorData: {
				firstName: "Grace",
				lastName: `Hopper${prefix}`,
				email: `grace.${prefix}@navy.mil`,
			},
		});
		await createSubmission({
			testRunId: prefix,
			title: "Col Turing",
			authorData: {
				firstName: "Alan",
				lastName: `Turing${prefix}`,
				email: `alan.${prefix}@bletchley.uk`,
			},
		});

		await page.goto("/admin/submissions");

		// Narrow to this run via the global box first, then refine with the column filter.
		const search = page.getByTestId("data-table-search");
		await search.fill(prefix);

		const hopperRow = page
			.getByTestId("submission-row")
			.filter({ visible: true, hasText: `Hopper${prefix}` });
		const turingRow = page
			.getByTestId("submission-row")
			.filter({ visible: true, hasText: `Turing${prefix}` });
		await expect(hopperRow).toBeVisible();
		await expect(turingRow).toBeVisible();

		// Open the Author column's filter popover and search by email.
		const authorHeader = page
			.getByRole("columnheader")
			.filter({ hasText: "Author" });
		await authorHeader.getByRole("button", { name: "Filter" }).click();
		const columnFilter = page.getByPlaceholder("Search...", { exact: true });
		await columnFilter.fill(`grace.${prefix}@`);

		await expect(hopperRow).toBeVisible();
		await expect(turingRow).toBeHidden();
	});
});
