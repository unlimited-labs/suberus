import { test, expect, isoDay } from "./fixtures";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";
import { SubmissionStatus, SubmissionType } from "../../../src/generated/prisma/enums";

test.describe.serial("Planner — Co-author conflicts", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
		await setSchedulePublished(false);
	});

	test("flags a shared co-author scheduled in two parallel sessions", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const shared = {
			firstName: "Shared",
			lastName: "Coauthor",
			email: `shared-coauthor-${testRun.testRunId}@test.com`,
		};
		const subA = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Talk A",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
			extraAuthors: [shared],
		});
		cleanup.track(subA.id);
		const subB = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Talk B",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
			extraAuthors: [shared],
		});
		cleanup.track(subB.id);

		const roomA = await createRoom(testRun.testRunId, "Room A");
		const roomB = await createRoom(testRun.testRunId, "Room B");
		const sessionA = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Parallel A",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 11),
			roomId: roomA,
		});
		const sessionB = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Parallel B",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 11),
			roomId: roomB,
		});
		await addPresentationToSession(sessionA, subA.id);
		await addPresentationToSession(sessionB, subB.id);

		await plannerPage.goto();
		await plannerPage.openPublishDialog();

		await expect(plannerPage.publishIssuesList).toBeVisible({ timeout: 10000 });
		await expect(plannerPage.publishIssuesList).toContainText(
			/Co-author double-booked/i,
		);
		await expect(plannerPage.publishIssuesList).toContainText("Shared Coauthor");
	});

	test("flags a presenter presenting in two parallel sessions", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const presenter = {
			firstName: "Pat",
			lastName: "Presenter",
			email: `pat-presenter-${testRun.testRunId}@test.com`,
		};
		const subA = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Keynote A",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
			authorData: presenter,
		});
		cleanup.track(subA.id);
		const subB = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Keynote B",
			status: SubmissionStatus.ACCEPTED,
			type: SubmissionType.ABSTRACT,
			authorData: presenter,
		});
		cleanup.track(subB.id);

		const roomA = await createRoom(testRun.testRunId, "Hall A");
		const roomB = await createRoom(testRun.testRunId, "Hall B");
		const sessionA = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Session A",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 11),
			roomId: roomA,
		});
		const sessionB = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Session B",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 11),
			roomId: roomB,
		});
		await addPresentationToSession(sessionA, subA.id);
		await addPresentationToSession(sessionB, subB.id);

		await plannerPage.goto();
		await plannerPage.openPublishDialog();

		await expect(plannerPage.publishIssuesList).toBeVisible({ timeout: 10000 });
		await expect(plannerPage.publishIssuesList).toContainText(
			/Presenter in parallel sessions/i,
		);
		await expect(plannerPage.publishIssuesList).toContainText("Pat Presenter");
	});
});
