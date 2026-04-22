import { SubmissionStatus, SubmissionType } from "../../../src/generated/prisma/enums";
import { createSubmission } from "../../helpers/test-db";
import { expect, test } from "./fixtures";

test.describe.serial("Planner — Unscheduled sidebar UX", () => {
	test("select-mode toggle controls checkbox visibility", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const s = await createSubmission({
			testRunId: testRun.testRunId,
			title: "SelectableOne",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(s.id);

		await plannerPage.goto();
		const row = plannerPage.unscheduledRow(s.id);
		await expect(row).toBeVisible();

		// Default: no checkbox
		await expect(row.getByRole("checkbox")).toBeHidden();

		// Enable via toggle button
		await plannerPage.selectModeToggle.click();
		await expect(row.getByRole("checkbox")).toBeVisible();

		// Disable via Escape hotkey
		await plannerPage.page.keyboard.press("Escape");
		await expect(row.getByRole("checkbox")).toBeHidden();

		// Enable via S hotkey
		await plannerPage.page.keyboard.press("s");
		await expect(row.getByRole("checkbox")).toBeVisible();
	});

	test("double-click on a submission row opens the reader at that item", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const s1 = await createSubmission({
			testRunId: testRun.testRunId,
			title: "DoubleClickFirst",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(s1.id);
		const s2 = await createSubmission({
			testRunId: testRun.testRunId,
			title: "DoubleClickTarget",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(s2.id);

		await plannerPage.goto();
		await plannerPage.unscheduledRow(s2.id).dblclick();

		const reader = plannerPage.page.getByTestId("bulk-reader");
		await expect(reader).toBeVisible();
		await expect(reader).toContainText(`${testRun.testRunId}_DoubleClickTarget`);
	});
});
