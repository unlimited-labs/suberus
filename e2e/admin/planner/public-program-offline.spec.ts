import type { Page } from "@playwright/test";
import { test, expect, isoDay } from "./fixtures";
import {
	createFee,
	createProgramSession,
	createRoom,
	createTestUser,
	deleteTestUser,
	setAppSetting,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";

const PERSISTED_PREFIXES = [
	"program/public",
	"program/favorites",
	"program/presentation",
	"conference/public-info",
	"participants/public",
];

function persistedQueryKeys(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const raw = window.localStorage.getItem("suberus-program-cache");
		if (!raw) return [];
		const parsed: { clientState?: { queries?: { queryKey: unknown[] }[] } } =
			JSON.parse(raw);
		return (parsed.clientState?.queries ?? []).map((q) => q.queryKey.join("/"));
	});
}

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

	test("persists only allow-listed keys and drops contact data with the entitlement", async ({
		publicProgramPage,
		page,
		context,
		testRun,
	}) => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
		await setSchedulePublished(true);
		await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);

		const surname = `Roster${testRun.testRunId}`;
		const attendee = await createTestUser({
			email: `offline-roster-${testRun.testRunId}@e2e.local`,
			firstName: "Ada",
			lastName: surname,
			contactConsent: true,
		});
		await createFee({ userId: attendee.id });
		const card = page
			.getByTestId("participant-card-button")
			.filter({ hasText: surname });

		try {
			await publicProgramPage.goto();
			await page.waitForFunction(
				() => navigator.serviceWorker.controller !== null,
				undefined,
				{ timeout: 15000 },
			);
			await page.reload();
			await page.getByTestId("program-participants-link").click();
			await expect(card).toBeVisible();

			await expect
				.poll(() => persistedQueryKeys(page))
				.toContain("participants/public");
			const persisted = await persistedQueryKeys(page);
			expect(
				persisted.filter(
					(key) => !PERSISTED_PREFIXES.some((p) => key.startsWith(p)),
				),
			).toEqual([]);

			// Only /program itself is in the service-worker cache, so reach the roster
			// the way an attendee does offline: the cached document, then a client nav.
			await context.setOffline(true);
			await publicProgramPage.goto();
			await page.getByTestId("program-participants-link").click();
			await expect(card).toBeVisible();
			await context.setOffline(false);

			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", false);
			await page.reload();
			await expect
				.poll(() => persistedQueryKeys(page))
				.not.toContain("participants/public");
		} finally {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", false);
			await deleteTestUser(attendee.id).catch(() => {});
		}
	});
});
