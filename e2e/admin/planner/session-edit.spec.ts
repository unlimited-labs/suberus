import { test, expect } from "./fixtures";
import {
	createProgramSession,
	createRoom,
	getPrisma,
	setConferenceDates,
} from "../../helpers/test-db";

function isoDay(offsetDays: number, hour: number): Date {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() + offsetDays);
	d.setUTCHours(hour, 0, 0, 0);
	return d;
}

test.describe.serial("Planner — Session editor", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("opens session editor and edits title", async ({
		plannerPage,
		testRun,
	}) => {
		const roomId = await createRoom(testRun.testRunId, "Aula");
		const start = isoDay(0, 10);
		const end = isoDay(0, 12);
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Morning Session",
			startAt: start,
			endAt: end,
			roomId,
		});

		await plannerPage.goto();
		await plannerPage.openSessionEditor(sessionId);

		const titleInput = plannerPage.page.getByTestId("session-editor-title");
		await expect(titleInput).toHaveValue(
			`${testRun.testRunId}_Morning Session`,
		);
		await titleInput.fill(`${testRun.testRunId}_Renamed`);
		await titleInput.blur();

		const db = getPrisma();
		await expect
			.poll(async () => {
				const s = await db.programSession.findUnique({
					where: { id: sessionId },
				});
				return s?.title;
			}, { timeout: 10000 })
			.toBe(`${testRun.testRunId}_Renamed`);
	});

	test("changes duration via editor", async ({ plannerPage, testRun }) => {
		const roomId = await createRoom(testRun.testRunId, "Room B");
		const start = isoDay(0, 13);
		const end = isoDay(0, 14);
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Short",
			startAt: start,
			endAt: end,
			roomId,
		});

		await plannerPage.goto();
		await plannerPage.openSessionEditor(sessionId);

		// 120 min = 6 slots × 20 min (default)
		const slotCountInput = plannerPage.page.getByTestId(
			"session-editor-slots-count",
		);
		const slotMinInput = plannerPage.page.getByTestId(
			"session-editor-slots-min",
		);
		await slotMinInput.fill("20");
		await slotMinInput.blur();
		await slotCountInput.fill("6");
		await slotCountInput.blur();

		const db = getPrisma();
		await expect
			.poll(async () => {
				const s = await db.programSession.findUnique({
					where: { id: sessionId },
				});
				if (!s) return 0;
				return Math.round(
					(s.endAt.getTime() - s.startAt.getTime()) / 60_000,
				);
			}, { timeout: 10000 })
			.toBe(120);
	});

	test("deletes session from editor", async ({ plannerPage, testRun }) => {
		const roomId = await createRoom(testRun.testRunId, "Room C");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "ToDelete",
			startAt: isoDay(0, 15),
			endAt: isoDay(0, 16),
			roomId,
		});

		await plannerPage.goto();
		await plannerPage.openSessionEditor(sessionId);
		await plannerPage.page.getByTestId("session-editor-delete").click();

		const db = getPrisma();
		await expect
			.poll(async () => {
				return db.programSession.count({ where: { id: sessionId } });
			}, { timeout: 10000 })
			.toBe(0);
	});
});
