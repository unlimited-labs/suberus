import { test, expect } from "./fixtures";
import {
	createProgramSession,
	createRoom,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";

function isoDay(offsetDays: number, hour: number): Date {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() + offsetDays);
	d.setUTCHours(hour, 0, 0, 0);
	return d;
}

test.describe.serial("Planner — Publish / Unpublish", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
		await setSchedulePublished(false);
	});

	test("publishes schedule from dialog", async ({ plannerPage, testRun }) => {
		const roomId = await createRoom(testRun.testRunId, "Pub Room");
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Pub Session",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 11),
			roomId,
		});

		await plannerPage.goto();
		await plannerPage.openPublishDialog();
		await plannerPage.confirmPublish();

		await expect(
			plannerPage.page.getByText(/Program published/i),
		).toBeVisible({ timeout: 10000 });
		await expect(plannerPage.unpublishButton).toBeVisible();
	});

	test("shows issues in publish dialog for overlapping sessions", async ({
		plannerPage,
		testRun,
	}) => {
		const roomId = await createRoom(testRun.testRunId, "Overlap");
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "A",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 12),
			roomId,
		});
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "B",
			startAt: isoDay(0, 11),
			endAt: isoDay(0, 13),
			roomId,
		});

		await plannerPage.goto();
		await plannerPage.openPublishDialog();

		await expect(plannerPage.publishIssuesList).toBeVisible({ timeout: 10000 });
		await expect(plannerPage.publishIssue(0)).toBeVisible();
	});

	test("unpublishes a published schedule", async ({ plannerPage, testRun }) => {
		await createRoom(testRun.testRunId, "UnpubRoom");
		await setSchedulePublished(true);

		await plannerPage.goto();
		await plannerPage.page.reload();
		await expect(plannerPage.unpublishButton).toBeVisible({ timeout: 15000 });
		await plannerPage.unpublishButton.click();

		await expect(
			plannerPage.page.getByText(/Program unpublished/i),
		).toBeVisible({ timeout: 10000 });
		await expect(plannerPage.publishButton).toBeVisible();
	});
});
