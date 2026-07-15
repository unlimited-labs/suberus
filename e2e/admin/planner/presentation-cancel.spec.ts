import { test, expect, isoDay } from "./fixtures";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	getPrisma,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";
import { SubmissionStatus } from "../../../src/generated/prisma/enums";

test.describe.serial("Planner — Cancelled presentation", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("cancel + restore toggle in the session editor persists", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Cancelable Talk",
			status: SubmissionStatus.ACCEPTED,
		});
		cleanup.track(sub.id);
		const roomId = await createRoom(testRun.testRunId, "Cancel Room");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Cancel Session",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 12),
			roomId,
		});
		const slotId = await addPresentationToSession(sessionId, sub.id, {
			durationMin: 30,
		});

		await plannerPage.goto();
		await plannerPage.openSessionEditor(sessionId);

		const cancelBtn = plannerPage.page.getByTestId(
			`presentation-cancel-${slotId}`,
		);
		const db = getPrisma();

		await expect(cancelBtn).toHaveAttribute("aria-pressed", "false");
		await cancelBtn.click();
		await expect(cancelBtn).toHaveAttribute("aria-pressed", "true");
		await expect
			.poll(
				async () =>
					(await db.presentationSlot.findUnique({ where: { id: slotId } }))
						?.cancelled,
				{ timeout: 10000 },
			)
			.toBe(true);

		await cancelBtn.click();
		await expect(cancelBtn).toHaveAttribute("aria-pressed", "false");
		await expect
			.poll(
				async () =>
					(await db.presentationSlot.findUnique({ where: { id: slotId } }))
						?.cancelled,
				{ timeout: 10000 },
			)
			.toBe(false);
	});

	test("cancelled talk is struck-through with a Cancelled tooltip on /program", async ({
		publicProgramPage,
		page,
		testRun,
		cleanup,
	}) => {
		const title = "Cancelled Public Talk";
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title,
			status: SubmissionStatus.ACCEPTED,
		});
		cleanup.track(sub.id);
		const roomId = await createRoom(testRun.testRunId, "Public Cancel Room");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Public Cancel Session",
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
			roomId,
		});
		const slotId = await addPresentationToSession(sessionId, sub.id);
		await getPrisma().presentationSlot.update({
			where: { id: slotId },
			data: { cancelled: true },
		});
		await setSchedulePublished(true);

		await publicProgramPage.goto();
		const row = page
			.getByTestId("presentation-row")
			.filter({ hasText: `${testRun.testRunId}_${title}` });
		await expect(row).toBeVisible({ timeout: 10000 });

		const struck = row.locator(".line-through");
		await expect(struck).toBeVisible();
		await expect(struck).toContainText(title);

		await struck.hover();
		await expect(page.getByRole("tooltip")).toContainText("Cancelled");
	});
});
