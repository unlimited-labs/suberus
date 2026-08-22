import { test, expect, isoDay } from "./fixtures";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	setConferenceDates,
} from "../../helpers/test-db";
import { SubmissionStatus, SubmissionType } from "../../../src/generated/prisma/enums";

test.describe.serial("Planner — Presentation assignment", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("assigned submission appears inside session editor; unscheduled ABSTRACT shows in sidebar", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const accepted = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Accepted Talk",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(accepted.id);
		const unscheduled = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Queued Talk",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(unscheduled.id);

		const roomId = await createRoom(testRun.testRunId, "Hall");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Presentations",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 12),
			roomId,
		});
		await addPresentationToSession(sessionId, accepted.id, {
			durationMin: 30,
		});

		await plannerPage.goto();

		await expect(plannerPage.unscheduledRow(unscheduled.id)).toBeVisible({
			timeout: 10000,
		});
		await expect(plannerPage.unscheduledRow(accepted.id)).toBeHidden();

		await plannerPage.openSessionEditor(sessionId);
		await expect(
			plannerPage.page.locator('[data-testid^="session-editor-slot-"]'),
		).toHaveCount(1);
	});
});
