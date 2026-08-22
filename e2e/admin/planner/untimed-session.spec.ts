import { expect, isoDay, test } from "./fixtures";
import { SubmissionStatus } from "../../../src/generated/prisma/enums";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	getPrisma,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";

test.describe.serial("Untimed (poster) sessions", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("holds more presentations than its window allows and shows them without clock times", async ({
		publicProgramPage,
		testRun,
		cleanup,
	}) => {
		const roomId = await createRoom(testRun.testRunId, "Poster Hall");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Poster Session",
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
			roomId,
			untimedSlots: true,
		});

		for (let i = 0; i < 8; i++) {
			const { id } = await createSubmission({
				testRunId: testRun.testRunId,
				title: `Poster ${i}`,
				status: SubmissionStatus.ACCEPTED,
			});
			cleanup.track(id);
			await addPresentationToSession(sessionId, id);
		}
		await setSchedulePublished(true);

		await publicProgramPage.goto();
		await expect(
			publicProgramPage
				.sessionByTitle(`${testRun.testRunId}_Poster Session`)
				.first(),
		).toBeVisible({ timeout: 10000 });

		const rows = publicProgramPage.presentationRows;
		await expect(rows).toHaveCount(8);
		await expect(rows.first()).toContainText("01");
		await expect(rows.first()).not.toContainText(/\d{1,2}:\d{2}/);
	});
	test("+ New dialog creates an untimed session", async ({
		plannerPage,
		testRun,
	}) => {
		const title = `${testRun.testRunId}_New dialog poster block`;
		await plannerPage.goto();
		await plannerPage.page.getByRole("button", { name: "New" }).click();
		await expect(plannerPage.createEventDialog).toBeVisible();

		await plannerPage.page.getByTestId("create-event-untimed").click();
		await expect(plannerPage.page.getByTestId("create-event-end")).toBeVisible();
		await plannerPage.page.getByTestId("create-event-title").fill(title);
		await plannerPage.page.getByTestId("create-event-submit").click();
		await expect(plannerPage.createEventDialog).toBeHidden();

		const created = await getPrisma().programSession.findFirst({
			where: { title },
		});
		expect(created?.untimedSlots).toBe(true);
	});
});
