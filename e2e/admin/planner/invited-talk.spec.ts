import {
	createProgramSession,
	createRoom,
	getPrisma,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";
import { expect, isoDay, test } from "./fixtures";

test.describe.serial("Planner — Invited talks", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("adds an invited talk, shows it on /program, deletes it with its slot", async ({
		plannerPage,
		publicProgramPage,
		testRun,
	}) => {
		const roomId = await createRoom(testRun.testRunId, "Main Hall");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Plenary",
			startAt: isoDay(0, 9),
			endAt: isoDay(0, 11),
			roomId,
		});

		await plannerPage.goto();
		await plannerPage.openSessionEditor(sessionId);
		await plannerPage.page.getByTestId("add-invited-talk").click();

		const dialog = plannerPage.page.getByTestId("invited-talk-dialog");
		await expect(dialog).toBeVisible();
		await dialog
			.getByTestId("invited-talk-title")
			.fill(`${testRun.testRunId}_Opening keynote`);
		await dialog.getByTestId("invited-talk-first-name").fill("Ada");
		await dialog.getByTestId("invited-talk-last-name").fill("Lovelace");
		await dialog
			.getByTestId("invited-talk-affiliation")
			.fill("Analytical Engine Institute");
		await dialog.getByTestId("invited-talk-submit").click();
		await expect(dialog).toBeHidden();

		const db = getPrisma();
		const invitedWhere = {
			sessionId,
			submission: { type: "INVITED" as const },
		};
		await expect
			.poll(() => db.presentationSlot.count({ where: invitedWhere }), {
				timeout: 10000,
			})
			.toBe(1);
		const slot = await db.presentationSlot.findFirstOrThrow({
			where: invitedWhere,
			select: { id: true, submissionId: true },
		});
		const placeholder = await db.submission.findUniqueOrThrow({
			where: { id: slot.submissionId },
			select: {
				status: true,
				content: true,
				authors: { select: { firstName: true, lastName: true, email: true } },
			},
		});
		expect(placeholder.status).toBe("ACCEPTED");
		expect(placeholder.content).toBe("");
		expect(placeholder.authors).toEqual([
			{ firstName: "Ada", lastName: "Lovelace", email: "" },
		]);

		await setSchedulePublished(true);
		await publicProgramPage.goto();
		const row = publicProgramPage.page
			.getByTestId("presentation-row")
			.filter({ hasText: `${testRun.testRunId}_Opening keynote` });
		await expect(row).toBeVisible({ timeout: 10000 });
		await expect(row).toContainText("Ada Lovelace");

		await plannerPage.goto();
		await plannerPage.openSessionEditor(sessionId);
		await plannerPage.page.getByTestId(`invited-talk-edit-${slot.id}`).click();
		const editDialog = plannerPage.page.getByTestId("invited-talk-dialog");
		await editDialog
			.getByTestId("invited-talk-title")
			.fill(`${testRun.testRunId}_Renamed keynote`);
		await editDialog.getByTestId("invited-talk-submit").click();
		await expect(editDialog).toBeHidden();

		await expect
			.poll(
				async () =>
					(
						await db.submission.findUniqueOrThrow({
							where: { id: slot.submissionId },
							select: { title: true },
						})
					).title,
				{ timeout: 10000 },
			)
			.toBe(`${testRun.testRunId}_Renamed keynote`);

		await plannerPage.page.getByTestId(`presentation-remove-${slot.id}`).click();

		await expect
			.poll(
				() => db.submission.count({ where: { id: slot.submissionId } }),
				{ timeout: 10000 },
			)
			.toBe(0);
	});
});
