import { test, expect } from "./fixtures";
import { createSubmission } from "../../helpers/test-db";
import { SubmissionStatus, SubmissionType } from "../../../src/generated/prisma/enums";

test.describe.serial("Planner — Sidebar grouping, search, type labels", () => {
	test("search filters unscheduled submissions", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const a = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Unique Alpha Title",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(a.id);
		const b = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Different Beta Title",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(b.id);

		await plannerPage.goto();
		await expect(plannerPage.unscheduledRow(a.id)).toBeVisible();
		await expect(plannerPage.unscheduledRow(b.id)).toBeVisible();

		await plannerPage.searchUnscheduled("Alpha");
		await expect(plannerPage.unscheduledRow(a.id)).toBeVisible();
		await expect(plannerPage.unscheduledRow(b.id)).toBeHidden();
	});

	test("labels ABSTRACT as 'Oral' and excludes FULL_PAPER", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const oral = await createSubmission({
			testRunId: testRun.testRunId,
			title: "OralTest",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(oral.id);
		const paper = await createSubmission({
			testRunId: testRun.testRunId,
			title: "PaperTest",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.FULL_PAPER,
		});
		cleanup.track(paper.id);

		await plannerPage.goto();
		await expect(plannerPage.unscheduledRow(oral.id)).toContainText(/Oral/i);
		await expect(plannerPage.unscheduledRow(paper.id)).toBeHidden();
	});

	test("switches grouping mode between Track and Presenter", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const s = await createSubmission({
			testRunId: testRun.testRunId,
			title: "GroupTest",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(s.id);

		await plannerPage.goto();
		await plannerPage.setGroupingMode("presenter");
		await expect(
			plannerPage.page.getByTestId("sidebar-grouping-presenter"),
		).toHaveAttribute("aria-selected", "true");

		await plannerPage.setGroupingMode("intake");
		await expect(
			plannerPage.page.getByTestId("sidebar-grouping-intake"),
		).toHaveAttribute("aria-selected", "true");
	});
});
