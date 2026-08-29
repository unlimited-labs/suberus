import { test, expect, isoDay } from "./fixtures";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	getPrisma,
	setConferenceDates,
} from "../../helpers/test-db";
import { SubmissionStatus, SubmissionType } from "../../../src/generated/prisma/enums";

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
		await plannerPage.page.getByTestId("session-editor-save").click();

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

		const slotCountInput = plannerPage.page.getByTestId(
			"session-editor-slots-count",
		);
		const slotMinInput = plannerPage.page.getByTestId(
			"session-editor-slots-min",
		);
		await slotMinInput.fill("20");
		await slotCountInput.fill("6");
		await plannerPage.page.getByTestId("session-editor-save").click();

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

	test("reorders presentations by keyboard and by dragging the handle", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const first = await createSubmission({
			testRunId: testRun.testRunId,
			title: "First Talk",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(first.id);
		const second = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Second Talk",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(second.id);

		const roomId = await createRoom(testRun.testRunId, "Room D");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Reorderable",
			startAt: isoDay(0, 9),
			endAt: isoDay(0, 11),
			roomId,
		});
		const firstSlot = await addPresentationToSession(sessionId, first.id, {
			order: 0,
		});
		await addPresentationToSession(sessionId, second.id, { order: 1 });

		await plannerPage.goto();
		await plannerPage.openSessionEditor(sessionId);

		const slots = plannerPage.sessionEditor.locator(
			'[data-testid^="session-editor-slot-"]',
		);
		await expect(slots).toHaveCount(2);

		await slots.nth(1).scrollIntoViewIfNeeded();

		const grip = plannerPage.sessionEditor.getByRole("button", {
			name: /^Reorder .*First Talk$/,
		});
		await grip.focus();
		await plannerPage.page.keyboard.press("ArrowDown");

		const db = getPrisma();
		const slotOrder = async () =>
			(await db.presentationSlot.findUnique({ where: { id: firstSlot } }))
				?.order;
		await expect.poll(slotOrder, { timeout: 10000 }).toBe(1);

		await plannerPage.page.keyboard.press("ArrowUp");
		await expect.poll(slotOrder, { timeout: 10000 }).toBe(0);

		const from = await grip.boundingBox();
		const target = await slots.nth(1).boundingBox();
		if (!from || !target) throw new Error("missing bounding box");

		// dnd-kit PointerSensor needs incremental moves, not a single jump.
		const mouse = plannerPage.page.mouse;
		await mouse.move(from.x + from.width / 2, from.y + from.height / 2);
		await mouse.down();
		const endY = target.y + target.height * 0.75;
		for (let i = 1; i <= 10; i++) {
			await mouse.move(
				from.x + from.width / 2,
				from.y + from.height / 2 + ((endY - from.y - from.height / 2) * i) / 10,
			);
		}
		await mouse.up();

		await expect.poll(slotOrder, { timeout: 10000 }).toBe(1);
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
