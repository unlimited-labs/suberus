import { test, expect } from "./fixtures";
import {
	createProgramSession,
	createRoom,
	setConferenceDates,
} from "../../helpers/test-db";

function isoDay(offsetDays: number, hour: number): Date {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() + offsetDays);
	d.setUTCHours(hour, 0, 0, 0);
	return d;
}

test.describe.serial("Planner — Issues popover", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(-1, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("shows room-overlap issue and jumps to session editor on click", async ({
		plannerPage,
		testRun,
	}) => {
		const roomId = await createRoom(testRun.testRunId, "Issue Room");
		const sessionA = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Alpha",
			startAt: isoDay(1, 10),
			endAt: isoDay(1, 12),
			roomId,
		});
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Beta",
			startAt: isoDay(1, 11),
			endAt: isoDay(1, 13),
			roomId,
		});

		await plannerPage.goto();
		await plannerPage.openIssuesPopover();

		const firstIssue = plannerPage.issueItem(0);
		await expect(firstIssue).toBeVisible();
		await firstIssue.getByRole("button").click();

		await expect(plannerPage.sessionEditor).toBeVisible();
		await expect(
			plannerPage.page.getByTestId("session-editor-title"),
		).toHaveValue(
			new RegExp(`${testRun.testRunId}_(Alpha|Beta)`),
		);
		void sessionA;
	});

	test("shows no-room issue when session lacks room", async ({
		plannerPage,
		testRun,
	}) => {
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Homeless",
			startAt: isoDay(1, 10),
			endAt: isoDay(1, 11),
		});

		await plannerPage.goto();
		await expect(plannerPage.issuesTrigger).toBeVisible({ timeout: 10000 });
		await plannerPage.openIssuesPopover();
		await expect(plannerPage.issuesPopover).toContainText(/no room/i);
	});
});
