import { test, expect, isoDay } from "./fixtures";
import {
	createRoom,
	createScheduleBreak,
	getPrisma,
	setConferenceDates,
} from "../../helpers/test-db";

test.describe.serial("Planner — Break editor", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("edits break title and duration", async ({ plannerPage, testRun }) => {
		const roomId = await createRoom(testRun.testRunId, "Foyer");
		const breakId = await createScheduleBreak(testRun.testRunId, {
			title: "Coffee",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 11),
			roomId,
		});

		await plannerPage.goto();
		await plannerPage.openBreakEditor(breakId);

		const titleInput = plannerPage.page.getByTestId("break-editor-title");
		await expect(titleInput).toHaveValue(`${testRun.testRunId}_Coffee`);
		await titleInput.fill(`${testRun.testRunId}_Lunch`);

		await plannerPage.page.getByTestId("break-editor-duration").fill("45");
		await plannerPage.page.getByTestId("break-editor-save").click();

		const db = getPrisma();
		await expect
			.poll(
				async () => {
					const b = await db.scheduleBreak.findUnique({
						where: { id: breakId },
					});
					if (!b) return null;
					return {
						title: b.title,
						durationMin: Math.round(
							(b.endAt.getTime() - b.startAt.getTime()) / 60_000,
						),
					};
				},
				{ timeout: 10000 },
			)
			.toEqual({ title: `${testRun.testRunId}_Lunch`, durationMin: 45 });
	});

	test("deletes break from editor", async ({ plannerPage, testRun }) => {
		const breakId = await createScheduleBreak(testRun.testRunId, {
			title: "ToDelete",
			startAt: isoDay(0, 13),
			endAt: isoDay(0, 14),
		});

		await plannerPage.goto();
		await plannerPage.openBreakEditor(breakId);
		await plannerPage.page.getByTestId("break-editor-delete").click();

		const db = getPrisma();
		await expect
			.poll(async () => db.scheduleBreak.count({ where: { id: breakId } }), {
				timeout: 10000,
			})
			.toBe(0);
	});
});
