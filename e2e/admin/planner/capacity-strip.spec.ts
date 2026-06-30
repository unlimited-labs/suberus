import { test, expect, isoDay } from "./fixtures";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	setConferenceDates,
} from "../../helpers/test-db";
import { SubmissionStatus, SubmissionType } from "../../../src/generated/prisma/enums";

test.describe.serial("Planner — Capacity strip", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("shows placed/total counts", async ({ plannerPage, testRun, cleanup }) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "C1",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(sub.id);
		const sub2 = await createSubmission({
			testRunId: testRun.testRunId,
			title: "C2",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
		});
		cleanup.track(sub2.id);

		const roomId = await createRoom(testRun.testRunId, "CapRoom");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "CapSession",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 12),
			roomId,
		});
		await addPresentationToSession(sessionId, sub.id, { durationMin: 30 });

		await plannerPage.goto();
		await expect(plannerPage.capacityStrip).toBeVisible();
		await expect(plannerPage.capacityStrip).toContainText(/placed/i);
	});
});
