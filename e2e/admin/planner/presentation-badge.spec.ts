import { SubmissionStatus } from "../../../src/generated/prisma/enums";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	getPrisma,
	setAppSetting,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";
import { expect, isoDay, test } from "./fixtures";

const BADGE = {
	id: "6d0f3a7e-1c8f-4a3d-9f2b-5a1c7e4b8d90",
	label: "Keynote",
	color: "#dc2626",
	style: "badge" as const,
};
const RIBBON = {
	id: "0b7c9e21-4d5a-4f6b-8c3e-2a9d1f7b6c54",
	label: "Award",
	color: "#0f766e",
	style: "ribbon" as const,
};

test.describe.serial("Planner — Presentation badges", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
		await setAppSetting("PROGRAM_BADGES", [BADGE, RIBBON]);
	});

	test.afterAll(async () => {
		await setAppSetting("PROGRAM_BADGES", []);
	});

	test("assigning a badge in the session editor persists", async ({
		plannerPage,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Badged Talk",
			status: SubmissionStatus.ACCEPTED,
		});
		cleanup.track(sub.id);
		const roomId = await createRoom(testRun.testRunId, "Badge Room");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Badge Session",
			startAt: isoDay(0, 10),
			endAt: isoDay(0, 12),
			roomId,
		});
		const slotId = await addPresentationToSession(sessionId, sub.id, {
			durationMin: 30,
		});

		await plannerPage.goto();
		await plannerPage.openSessionEditor(sessionId);

		const select = plannerPage.page.getByTestId(
			`presentation-badge-${slotId}`,
		);
		await expect(select).toBeVisible();
		await select.click();
		await plannerPage.page
			.getByRole("option", { name: BADGE.label, exact: true })
			.click();

		const db = getPrisma();
		await expect
			.poll(
				async () =>
					(await db.presentationSlot.findUnique({ where: { id: slotId } }))
						?.badgeId,
				{ timeout: 10000 },
			)
			.toBe(BADGE.id);
	});

	test("deleting a badge definition clears it from its talks", async ({
		programSettingsPage,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Orphaned Badge Talk",
			status: SubmissionStatus.ACCEPTED,
		});
		cleanup.track(sub.id);
		const roomId = await createRoom(testRun.testRunId, "Orphan Room");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Orphan Session",
			startAt: isoDay(1, 10),
			endAt: isoDay(1, 12),
			roomId,
		});
		const slotId = await addPresentationToSession(sessionId, sub.id);
		const db = getPrisma();
		await db.presentationSlot.update({
			where: { id: slotId },
			data: { badgeId: BADGE.id },
		});

		await programSettingsPage.goto();
		await programSettingsPage.page
			.getByTestId(`program-badge-remove-${BADGE.id}`)
			.click();
		await programSettingsPage.page.getByTestId("program-badge-save").click();

		await expect
			.poll(
				async () =>
					(await db.presentationSlot.findUnique({ where: { id: slotId } }))
						?.badgeId,
				{ timeout: 10000 },
			)
			.toBeNull();
	});

	test("badge and ribbon render on the public program", async ({
		publicProgramPage,
		testRun,
		cleanup,
	}) => {
		const badged = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Public Badged Talk",
			status: SubmissionStatus.ACCEPTED,
		});
		const ribboned = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Public Ribboned Talk",
			status: SubmissionStatus.ACCEPTED,
		});
		cleanup.track(badged.id);
		cleanup.track(ribboned.id);
		const roomId = await createRoom(testRun.testRunId, "Public Badge Room");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Public Badge Session",
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 16),
			roomId,
		});
		const badgedSlot = await addPresentationToSession(sessionId, badged.id);
		const ribbonedSlot = await addPresentationToSession(sessionId, ribboned.id);
		const db = getPrisma();
		await db.presentationSlot.update({
			where: { id: badgedSlot },
			data: { badgeId: BADGE.id },
		});
		await db.presentationSlot.update({
			where: { id: ribbonedSlot },
			data: { badgeId: RIBBON.id },
		});
		await setSchedulePublished(true);

		await publicProgramPage.goto();
		const badgedRow = publicProgramPage.presentationRows.filter({
			hasText: `${testRun.testRunId}_Public Badged Talk`,
		});
		await expect(badgedRow).toBeVisible({ timeout: 10000 });
		await expect(
			badgedRow.getByTestId("presentation-badge"),
		).toHaveText(BADGE.label);

		const ribbonedRow = publicProgramPage.presentationRows.filter({
			hasText: `${testRun.testRunId}_Public Ribboned Talk`,
		});
		await expect(
			ribbonedRow.getByTestId("presentation-badge"),
		).toHaveText(RIBBON.label);

		await badgedRow.click();
		await expect(
			publicProgramPage.preview.getByTestId("presentation-badge"),
		).toHaveText(BADGE.label);
	});
});
