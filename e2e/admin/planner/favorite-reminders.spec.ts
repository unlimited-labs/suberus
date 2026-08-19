import { test, expect, isoDay, resetPlannerProgramDefaults } from "./fixtures";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	setSchedulePublished,
} from "../../helpers/test-db";

test.describe.serial("Favorite reminders", () => {
	test.beforeEach(resetPlannerProgramDefaults);

	async function seedPublishedProgram(testRunId: string) {
		const roomId = await createRoom(testRunId, "Reminder Room");
		const sessionId = await createProgramSession({
			testRunId,
			title: "Reminder Session",
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
			roomId,
		});
		const submission = await createSubmission({
			testRunId,
			title: "Reminder Talk",
			content: "Abstract body for the reminder talk.",
			authorData: { firstName: "Grace", lastName: "Hopper" },
			keywords: ["scheduling"],
		});
		await addPresentationToSession(sessionId, submission.id);
		await setSchedulePublished(true);
	}

	test("signed-in user menu exposes Conference system and Log out", async ({
		publicProgramPage,
		page,
		testRun,
	}) => {
		await seedPublishedProgram(testRun.testRunId);

		await publicProgramPage.goto();
		await page.getByTestId("program-auth-link").click();

		const menu = page.getByTestId("program-user-menu");
		await expect(menu).toBeVisible();
		await expect(menu).toContainText("Conference system");
		await expect(menu).toContainText("Log out");
	});

	test("admin reminder lead-time persists across reload", async ({
		programSettingsPage,
		page,
	}) => {
		await programSettingsPage.goto();

		await programSettingsPage.reminderLeadInput.fill("12");
		await programSettingsPage.plannerSettingsSave.click();
		await expect(page.getByText(/Planner settings saved/i)).toBeVisible();

		await programSettingsPage.goto();
		await expect(programSettingsPage.reminderLeadInput).toHaveValue("12");
	});
});
