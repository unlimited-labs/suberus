import { test, expect } from "./fixtures";
import {
	createProgramSession,
	createRoom,
	setAppSetting,
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
			isoDay(0, 0).toISOString(),
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
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
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
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
			roomId,
		});
		await setSchedulePublished(false);

		await page.goto("/program");
		await expect(
			page.getByText(`${testRun.testRunId}_Draft Session`),
		).toBeHidden();
	});

	test.describe("themes", () => {
		test.afterEach(async () => {
			await setAppSetting("PROGRAM_THEME", "default");
		});

		async function publishOneSession(testRunId: string, title: string) {
			const roomId = await createRoom(testRunId, `Room ${title}`);
			await createProgramSession({
				testRunId,
				title,
				startAt: isoDay(0, 14),
				endAt: isoDay(0, 15),
				roomId,
			});
			await setSchedulePublished(true);
		}

		test("default theme renders, editorial markers absent", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_THEME", "default");
			await publishOneSession(testRun.testRunId, "Theme Default Talk");

			await publicProgramPage.goto();
			await expect(page.getByTestId("program-theme-default")).toBeVisible();
			await expect(page.getByTestId("program-theme-editorial")).toBeHidden();
			await expect(publicProgramPage.ribbon).toBeHidden();
		});

		test("editorial theme renders when selected", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_THEME", "editorial");
			await publishOneSession(testRun.testRunId, "Theme Editorial Talk");

			await publicProgramPage.goto();
			await expect(page.getByTestId("program-theme-editorial")).toBeVisible();
			await expect(page.getByTestId("program-theme-default")).toBeHidden();
			await expect(publicProgramPage.ribbon).toBeVisible();
		});
	});
});
