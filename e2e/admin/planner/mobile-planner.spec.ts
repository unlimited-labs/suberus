import { test, expect, loginAsAdmin } from "./fixtures";
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

test.describe.serial("Planner — Mobile stacked list", () => {
	test.beforeEach(async ({ page }, testInfo) => {
		if (!testInfo.project.name.includes("mobile")) {
			test.skip();
		}
		await loginAsAdmin(page);
		await setConferenceDates(
			isoDay(-1, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("mobile list renders sessions and opens editor", async ({
		plannerPage,
		testRun,
	}) => {
		const roomId = await createRoom(testRun.testRunId, "MobRoom");
		const todayOffset = 0;
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Mobile Session",
			startAt: isoDay(todayOffset, 10),
			endAt: isoDay(todayOffset, 11),
			roomId,
		});

		await plannerPage.goto();
		await expect(plannerPage.page.getByTestId("mobile-planner")).toBeVisible();

		const card = plannerPage.page.getByTestId(`mobile-session-${sessionId}`);
		await expect(card).toBeVisible({ timeout: 10000 });
		await card.click();
		await expect(plannerPage.sessionEditor).toBeVisible();
	});
});
