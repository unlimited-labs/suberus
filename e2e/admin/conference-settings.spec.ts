import { expect, test } from "@playwright/test";
import { AdminSettingsPage } from "./fixtures";
import { getPrisma } from "../helpers/test-db";

test.describe.serial("Admin Conference Settings", () => {
	let adminSettingsPage: AdminSettingsPage;
	let originalName: string | null = null;

	test.beforeAll(async () => {
		const db = getPrisma();
		const setting = await db.appSetting.findUnique({
			where: { key: "CONFERENCE_NAME" },
		});
		originalName = (setting?.value as string) ?? null;
	});

	test.afterAll(async () => {
		if (originalName === null) return;
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_NAME" },
			update: { value: originalName },
			create: { key: "CONFERENCE_NAME", value: originalName },
		});
	});

	test.beforeEach(async ({ page }, testInfo) => {
		adminSettingsPage = new AdminSettingsPage(page);
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToConferenceTab(testInfo);
	});

	test("can change and save conference name", async ({ page }, testInfo) => {
		// Arrange
		const testRunId = `${testInfo.testId.slice(0, 8)}`;
		const newName = `E2E Conference ${testRunId}`;
		const input = adminSettingsPage.getConferenceNameInput();

		// Act
		await input.fill(newName);
		await adminSettingsPage.saveConferenceSettings();

		// Assert
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("validates conference name is required", async ({ page }) => {
		// Arrange
		const input = adminSettingsPage.getConferenceNameInput();

		// Act
		await input.fill("");
		await adminSettingsPage.saveConferenceSettings();

		// Assert - Zod validation error or toast
		await expect(page.getByText(/name required|failed/i)).toBeVisible({ timeout: 10000 });
	});

	test("conference name persists across page reloads", async ({ page }, testInfo) => {
		// Arrange
		const testRunId = `${testInfo.testId.slice(0, 8)}`;
		const newName = `Persist Test ${testRunId}`;
		const input = adminSettingsPage.getConferenceNameInput();

		// Act
		await input.fill(newName);
		await adminSettingsPage.saveConferenceSettings();
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 10000 });
		await page.reload();
		await adminSettingsPage.switchToConferenceTab(testInfo);

		// Assert
		await expect(input).toHaveValue(newName);
	});

	test("can change and save conference subtitle", async ({ page }) => {
		// Arrange
		const subtitleInput = page.getByLabel("Conference Subtitle (optional)");

		// Act
		await subtitleInput.fill("International Conference on Test Methods");
		await adminSettingsPage.saveConferenceSettings();

		// Assert
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 5000 });
	});

	test("subtitle persists across page reloads", async ({ page }, testInfo) => {
		// Arrange
		const testSubtitle = "E2E Test Subtitle Persistence";
		const subtitleInput = page.getByLabel("Conference Subtitle (optional)");

		await subtitleInput.fill(testSubtitle);
		await adminSettingsPage.saveConferenceSettings();
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 5000 });

		// Act - reload page
		await page.reload();
		await adminSettingsPage.switchToConferenceTab(testInfo);

		// Assert
		await expect(subtitleInput).toHaveValue(testSubtitle);
	});

	test("subtitle is optional (can be empty)", async ({ page }) => {
		// Arrange
		const subtitleInput = page.getByLabel("Conference Subtitle (optional)");

		// Act
		await subtitleInput.clear();
		await adminSettingsPage.saveConferenceSettings();

		// Assert
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 5000 });
	});

	test("timezone pre-fills from browser and persists after save", async ({
		page,
	}) => {
		// Timezone combobox lives on the Program tab (moved from Conference/Planner
		// tabs in commit bae3509). Use ?tab=program URL which works on desktop+mobile.

		// Arrange — reset stored value so the UI falls back to browser detection
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_TIMEZONE" },
			update: { value: "" },
			create: { key: "CONFERENCE_TIMEZONE", value: "" },
		});
		await page.goto("/admin/settings?tab=program");

		const combobox = adminSettingsPage.getTimezoneCombobox();

		// Assert — combobox is pre-filled (browser detection), not the placeholder
		await expect(combobox).toBeVisible({ timeout: 10000 });
		await expect(combobox).not.toHaveText(/Select timezone/i);

		// Act — pick a known zone
		await combobox.click();
		await page.getByPlaceholder("Search timezone...").fill("Europe/Warsaw");
		await page.getByRole("option", { name: "Europe/Warsaw" }).click();
		await page.getByRole("button", { name: "Save" }).first().click();
		await expect(page.getByText(/Planner settings saved/i)).toBeVisible({
			timeout: 10000,
		});

		// Assert — persisted after reload
		await page.goto("/admin/settings?tab=program");
		await expect(adminSettingsPage.getTimezoneCombobox()).toHaveText(
			/Europe\/Warsaw/,
			{ timeout: 10000 },
		);
	});
});
