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

test.describe.serial("Public /program", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(-1, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("shows published sessions to anonymous users", async ({
		publicProgramPage,
		testRun,
	}) => {
		const roomId = await createRoom(testRun.testRunId, "Public Room");
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Keynote Alpha",
			startAt: isoDay(2, 9),
			endAt: isoDay(2, 10),
			roomId,
		});
		await setSchedulePublished(true);

		await publicProgramPage.goto();
		await expect(
			publicProgramPage.sessionByTitle(
				`${testRun.testRunId}_Keynote Alpha`,
			).first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("hides unpublished schedule", async ({ page, testRun }) => {
		const roomId = await createRoom(testRun.testRunId, "Draft Room");
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Draft Session",
			startAt: isoDay(2, 9),
			endAt: isoDay(2, 10),
			roomId,
		});
		await setSchedulePublished(false);

		await page.goto("/program");
		await expect(
			page.getByText(`${testRun.testRunId}_Draft Session`),
		).toBeHidden();
	});
});
