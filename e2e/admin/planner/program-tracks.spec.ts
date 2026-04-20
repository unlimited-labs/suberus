import { test, expect, loginAsAdmin } from "./fixtures";
import {
	createProgramTrack,
	createTrack,
	deleteProgramTrack,
	deleteTrack,
	getPrisma,
} from "../../helpers/test-db";

test.describe.serial("Program Settings — Program Tracks CRUD", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test("lists existing program tracks", async ({
		programSettingsPage,
		testRun,
	}, testInfo) => {
		const trackId = await createProgramTrack(testRun.testRunId, "AI", {
			color: "#ef4444",
		});

		await programSettingsPage.goto(testInfo);
		await expect(programSettingsPage.programTrackRow(trackId)).toBeVisible();
		await expect(programSettingsPage.programTrackRow(trackId)).toContainText(
			`${testRun.testRunId}_AI`,
		);

		await deleteProgramTrack(trackId);
	});

	test("creates a new program track", async ({
		programSettingsPage,
		testRun,
	}, testInfo) => {
		await programSettingsPage.goto(testInfo);

		const name = `${testRun.testRunId}_Robotics`;
		await programSettingsPage.createProgramTrack({ name });

		await expect(
			programSettingsPage.page.getByText("Program track created"),
		).toBeVisible({ timeout: 10000 });
		await expect(programSettingsPage.programTracksList).toContainText(name);

		const db = getPrisma();
		const row = await db.programTrack.findUnique({ where: { name } });
		if (row) await deleteProgramTrack(row.id);
	});

	test("imports program tracks from intake tracks", async ({
		programSettingsPage,
		testRun,
	}, testInfo) => {
		const intakeTrackId = await createTrack(testRun.testRunId, "Intake A");

		await programSettingsPage.goto(testInfo);
		await programSettingsPage.importProgramTracksButton.click();

		await expect(
			programSettingsPage.page.getByText(/Imported \d+ track|No new tracks/i),
		).toBeVisible({ timeout: 10000 });
		await expect(programSettingsPage.programTracksList).toContainText(
			`${testRun.testRunId}_Intake A`,
		);

		await deleteTrack(intakeTrackId);
		const db = getPrisma();
		const imported = await db.programTrack.findFirst({
			where: { name: `${testRun.testRunId}_Intake A` },
		});
		if (imported) await deleteProgramTrack(imported.id);
	});

	test("detects series suffix from name", async ({
		programSettingsPage,
		testRun,
	}, testInfo) => {
		await programSettingsPage.goto(testInfo);
		await programSettingsPage.createProgramTrackButton.click();
		await programSettingsPage.programTrackName.fill(
			`${testRun.testRunId}_ML 2`,
		);

		await expect(
			programSettingsPage.programTrackDialog.getByText(/Detected series/i),
		).toBeVisible();
		await expect(
			programSettingsPage.programTrackDialog.getByText(
				`${testRun.testRunId}_ML · #2`,
			),
		).toBeVisible();
	});

	test("deletes a program track with no sessions", async ({
		programSettingsPage,
		testRun,
	}, testInfo) => {
		const trackId = await createProgramTrack(testRun.testRunId, "ToDelete");

		await programSettingsPage.goto(testInfo);
		const row = programSettingsPage.programTrackRow(trackId);
		await row.getByTestId("program-track-delete").click();
		await row.getByTestId("program-track-confirm-delete").click();

		await expect(
			programSettingsPage.page.getByText("Program track deleted"),
		).toBeVisible({ timeout: 10000 });
		await expect(row).toBeHidden({ timeout: 10000 });
	});
});
