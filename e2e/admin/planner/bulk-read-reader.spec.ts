import { test, expect, loginAsAdmin } from "./fixtures";
import { createSubmission } from "../../helpers/test-db";
import { SubmissionStatus, SubmissionType } from "../../../src/generated/prisma/enums";

test.describe.serial("Planner — Bulk read mode", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test("opens reader and navigates next/prev between abstracts", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const s1 = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Reader A",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(s1.id);
		const s2 = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Reader B",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(s2.id);

		await plannerPage.goto();
		await plannerPage.bulkReadButton.click();

		const reader = plannerPage.page.getByTestId("bulk-reader");
		await expect(reader).toBeVisible();

		await plannerPage.page.getByTestId("bulk-reader-next").click();
		await plannerPage.page.getByTestId("bulk-reader-prev").click();

		await plannerPage.page.getByTestId("bulk-reader-close").click();
		await expect(reader).toBeHidden();
	});
});
