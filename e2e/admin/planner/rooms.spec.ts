import { test, expect, loginAsAdmin } from "./fixtures";
import { createRoom, deleteRoom, getPrisma } from "../../helpers/test-db";

test.describe.serial("Program Settings — Rooms CRUD", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test("lists existing rooms", async ({ programSettingsPage, testRun }, testInfo) => {
		const roomId = await createRoom(testRun.testRunId, "Aula Magna", {
			description: "Main hall, floor 1",
		});

		await programSettingsPage.goto(testInfo);
		await expect(programSettingsPage.roomRow(roomId)).toBeVisible();
		await expect(programSettingsPage.roomRow(roomId)).toContainText(
			`${testRun.testRunId}_Aula Magna`,
		);

		await deleteRoom(roomId);
	});

	test("creates a new room with description and link", async ({
		programSettingsPage,
		testRun,
	}, testInfo) => {
		await programSettingsPage.goto(testInfo);

		const name = `${testRun.testRunId}_Room 101`;
		await programSettingsPage.createRoom({
			name,
			description: "Second floor",
			link: "https://maps.example.com/room101",
		});

		await expect(programSettingsPage.page.getByText("Room created")).toBeVisible({
			timeout: 10000,
		});
		await expect(programSettingsPage.roomsList).toContainText(name);

		const db = getPrisma();
		const row = await db.room.findUnique({ where: { name } });
		expect(row?.description).toBe("Second floor");
		expect(row?.link).toBe("https://maps.example.com/room101");
		if (row) await deleteRoom(row.id);
	});

	test("rejects invalid URL in link", async ({ programSettingsPage, testRun }, testInfo) => {
		await programSettingsPage.goto(testInfo);
		await programSettingsPage.createRoomButton.click();
		await expect(programSettingsPage.roomDialog).toBeVisible();
		await programSettingsPage.roomName.fill(`${testRun.testRunId}_Invalid`);
		await programSettingsPage.roomLink.fill("not-a-url");
		await programSettingsPage.roomSubmit.click();

		await expect(
			programSettingsPage.page.getByText("Link must be a valid URL"),
		).toBeVisible({ timeout: 5000 });
		await expect(programSettingsPage.roomDialog).toBeVisible();
	});

	test("deletes an empty room", async ({ programSettingsPage, testRun }, testInfo) => {
		const roomId = await createRoom(testRun.testRunId, "Temp Room");

		await programSettingsPage.goto(testInfo);
		const row = programSettingsPage.roomRow(roomId);
		await expect(row).toBeVisible();
		await row.getByTestId("room-delete").click();
		await row.getByTestId("room-confirm-delete").click();

		await expect(
			programSettingsPage.page.getByText("Room deleted"),
		).toBeVisible({ timeout: 10000 });
		await expect(row).toBeHidden({ timeout: 10000 });
	});
});
