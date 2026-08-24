import { test, expect, isoDay } from "./fixtures";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createScheduleBreak,
	createSubmission,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";
import {
	SubmissionStatus,
	SubmissionType,
} from "../../../src/generated/prisma/enums";

// Clearing wipes rows this run does not own, so everything is seeded per test.
test.describe.serial("Planner — Clear plan", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
		await setSchedulePublished(false);
	});

	test("wipes sessions and breaks, returns the talk to the queue", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const talk = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Clearable Talk",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(talk.id);

		const roomId = await createRoom(testRun.testRunId, "Clear Hall");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Clearable Session",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 12),
			roomId,
		});
		await addPresentationToSession(sessionId, talk.id, { durationMin: 30 });
		const breakId = await createScheduleBreak(testRun.testRunId, {
			title: "Clearable Coffee",
			startAt: isoDay(0, 12),
			endAt: isoDay(0, 13),
			roomId,
		});

		await plannerPage.goto();
		await expect(plannerPage.sessionCard(sessionId)).toBeVisible({
			timeout: 10000,
		});
		await expect(plannerPage.unscheduledRow(talk.id)).toBeHidden();

		await plannerPage.openClearPlanDialog();
		await expect(plannerPage.clearPlanConfirm).toBeDisabled();
		await plannerPage.clearPlanInput.fill("understood");
		await expect(plannerPage.clearPlanConfirm).toBeDisabled();

		await plannerPage.confirmClearPlan();

		await expect(plannerPage.sessionCard(sessionId)).toBeHidden();
		await expect(plannerPage.breakCard(breakId)).toBeHidden();
		await expect(plannerPage.unscheduledRow(talk.id)).toBeVisible({
			timeout: 10000,
		});
	});

	test("is unavailable while the program is published", async ({
		plannerPage,
	}) => {
		await setSchedulePublished(true);

		await plannerPage.goto();
		await expect(plannerPage.clearPlanButton).toBeDisabled();
	});
});
