import { expect, test } from "./fixtures";
import {
	createProgramSession,
	createRoom,
	setAppSetting,
	setSchedulePublished,
	snapshotAppSettings,
} from "../../helpers/test-db";

// The suite pins timezoneId to UTC, which hides every conference-zone bug:
// only a viewer whose zone differs from the venue's reveals a shifted day.
const CONF_KEYS = [
	"CONFERENCE_DATE_START",
	"CONFERENCE_DATE_END",
	"CONFERENCE_TIMEZONE",
] as const;

async function seedConference(zone: string) {
	await setAppSetting("CONFERENCE_DATE_START", "2026-09-13");
	await setAppSetting("CONFERENCE_DATE_END", "2026-09-16");
	await setAppSetting("CONFERENCE_TIMEZONE", zone);
}

function dayTab(page: import("@playwright/test").Page, label: RegExp) {
	return page
		.getByRole("navigation", { name: "Select day" })
		.getByRole("button", { name: label });
}

test.describe.serial("Public /program across timezones", () => {
	let restore: () => Promise<void>;

	test.beforeAll(async () => {
		({ restore } = await snapshotAppSettings(CONF_KEYS));
	});

	test.afterAll(async () => {
		await restore();
	});

	test.describe("viewer east of the venue", () => {
		test.use({ timezoneId: "Asia/Tokyo" });

		test("keeps the venue's days and clock, and names the zone", async ({
			page,
			publicProgramPage,
			testRun,
		}) => {
			await seedConference("Europe/Warsaw");
			const roomId = await createRoom(testRun.testRunId, "TZ Room East");
			await createProgramSession({
				testRunId: testRun.testRunId,
				title: "Closing Lecture",
				// 09:00–10:00 on the LAST conference day, Warsaw wall clock (CEST).
				startAt: new Date("2026-09-16T09:00:00+02:00"),
				endAt: new Date("2026-09-16T10:00:00+02:00"),
				roomId,
			});
			await setSchedulePublished(true);

			await publicProgramPage.goto();

			await expect(dayTab(page, /^13 Sun Sep$/i)).toBeVisible();
			await expect(dayTab(page, /^16 Wed Sep$/i)).toBeVisible();
			await expect(
				page.getByTestId("program-timezone-note"),
			).toContainText("Europe/Warsaw");

			await dayTab(page, /^16 Wed Sep$/i).click();
			await expect(
				publicProgramPage
					.sessionByTitle(`${testRun.testRunId}_Closing Lecture`)
					.first(),
			).toBeVisible();
			await expect(page.getByText("09:00", { exact: false }).first()).toBeVisible();
		});
	});

	test.describe("venue west of UTC", () => {
		test.use({ timezoneId: "Europe/Warsaw" });

		test("keeps the first conference day reachable", async ({
			page,
			publicProgramPage,
			testRun,
		}) => {
			await seedConference("America/New_York");
			const roomId = await createRoom(testRun.testRunId, "TZ Room West");
			await createProgramSession({
				testRunId: testRun.testRunId,
				title: "Opening Lecture",
				// 09:00–10:00 on the FIRST conference day, New York wall clock (EDT).
				startAt: new Date("2026-09-13T09:00:00-04:00"),
				endAt: new Date("2026-09-13T10:00:00-04:00"),
				roomId,
			});
			await setSchedulePublished(true);

			await publicProgramPage.goto();

			await expect(dayTab(page, /^13 Sun Sep$/i)).toBeVisible();
			await expect(dayTab(page, /^16 Wed Sep$/i)).toBeVisible();
			await expect(
				page.getByTestId("program-timezone-note"),
			).toContainText("America/New_York");
			await expect(
				publicProgramPage
					.sessionByTitle(`${testRun.testRunId}_Opening Lecture`)
					.first(),
			).toBeVisible();
		});
	});
});
