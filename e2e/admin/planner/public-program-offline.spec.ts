import { test, expect, isoDay } from "./fixtures";
import {
	createProgramSession,
	createRoom,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";

test.describe.serial("Public /program offline", () => {
	test("serves the programme from the service worker cache while offline", async ({
		publicProgramPage,
		page,
		context,
		testRun,
	}) => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
		const roomId = await createRoom(testRun.testRunId, "Offline Room");
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Offline Keynote",
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
			roomId,
		});
		await setSchedulePublished(true);

		await publicProgramPage.goto();
		await page.waitForFunction(
			() => navigator.serviceWorker.controller !== null,
			undefined,
			{ timeout: 15000 },
		);
		// The controller only starts intercepting after it claims the client, so
		// reload once online to make sure the document itself gets cached.
		await page.reload();
		await expect(
			publicProgramPage
				.sessionByTitle(`${testRun.testRunId}_Offline Keynote`)
				.first(),
		).toBeVisible({ timeout: 15000 });

		await context.setOffline(true);
		await page.reload();

		await expect(
			publicProgramPage
				.sessionByTitle(`${testRun.testRunId}_Offline Keynote`)
				.first(),
		).toBeVisible({ timeout: 15000 });
		await expect(page.getByTestId("program-offline-badge")).toBeVisible();

		await context.setOffline(false);
	});
});
