import { test, expect, isoDay } from "./fixtures";
import {
	createScheduleBreak,
	getPrisma,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";

test.describe.serial("Planner — Event item", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("edits event description, location and end time", async ({
		plannerPage,
		testRun,
	}) => {
		const eventId = await createScheduleBreak(testRun.testRunId, {
			title: "Dinner",
			kind: "EVENT",
			description: "Welcome reception",
			startAt: isoDay(0, 12),
			endAt: isoDay(0, 14),
		});

		await plannerPage.goto();
		await plannerPage.openBreakEditor(eventId);

		await expect(plannerPage.page.getByTestId("break-editor")).toContainText(
			"Event editor",
		);

		await plannerPage.page
			.getByTestId("break-editor-description")
			.fill("Gala dinner at the Old Town Hall");
		await plannerPage.page
			.getByTestId("break-editor-location")
			.fill("Restaurant Stary Młyn");
		await plannerPage.page
			.getByTestId("break-editor-location-url")
			.fill("https://maps.example.com/stary-mlyn");
		await plannerPage.page.getByTestId("break-editor-save").click();

		const db = getPrisma();
		await expect
			.poll(
				async () => {
					const b = await db.scheduleBreak.findUnique({
						where: { id: eventId },
					});
					return b
						? {
								kind: b.kind,
								description: b.description,
								location: b.location,
								locationUrl: b.locationUrl,
							}
						: null;
				},
				{ timeout: 10000 },
			)
			.toEqual({
				kind: "EVENT",
				description: "Gala dinner at the Old Town Hall",
				location: "Restaurant Stary Młyn",
				locationUrl: "https://maps.example.com/stary-mlyn",
			});
	});

	test("renders as a featured card with description on /program", async ({
		publicProgramPage,
		testRun,
	}) => {
		const eventId = await createScheduleBreak(testRun.testRunId, {
			title: "City Tour",
			kind: "EVENT",
			description: "Guided walk through the historic district",
			location: "Main Square",
			locationUrl: "https://maps.example.com/main-square",
			startAt: isoDay(0, 16),
			endAt: isoDay(0, 18),
		});
		await setSchedulePublished(true);

		await publicProgramPage.goto();

		const card = publicProgramPage.page.getByTestId(`program-event-${eventId}`);
		await expect(card).toBeVisible({ timeout: 10000 });
		await expect(card).toContainText(`${testRun.testRunId}_City Tour`);
		await expect(card).toContainText("Guided walk through the historic district");
		await expect(
			card.getByRole("link", { name: "Main Square" }),
		).toHaveAttribute("href", "https://maps.example.com/main-square");
	});
});
