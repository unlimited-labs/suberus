import { expect, test } from "../helpers/base-fixtures";
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
		const testRunId = `${testInfo.testId.slice(0, 8)}`;
		const newName = `E2E Conference ${testRunId}`;
		const input = adminSettingsPage.getConferenceNameInput();

		await input.fill(newName);
		await adminSettingsPage.saveConferenceSettings();

		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("validates conference name is required", async ({ page }) => {
		const input = adminSettingsPage.getConferenceNameInput();

		await input.fill("");
		await adminSettingsPage.saveConferenceSettings();

		await expect(page.getByText(/name required|failed/i)).toBeVisible({ timeout: 10000 });
	});

	test("conference name persists across page reloads", async ({ page }, testInfo) => {
		const testRunId = `${testInfo.testId.slice(0, 8)}`;
		const newName = `Persist Test ${testRunId}`;
		const input = adminSettingsPage.getConferenceNameInput();

		await input.fill(newName);
		await adminSettingsPage.saveConferenceSettings();
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 10000 });
		await page.reload();
		await adminSettingsPage.switchToConferenceTab(testInfo);

		await expect(input).toHaveValue(newName);
	});

	test("can change and save conference subtitle", async ({ page }) => {
		const subtitleInput = page.getByLabel("Conference Subtitle (optional)");

		await subtitleInput.fill("International Conference on Test Methods");
		await adminSettingsPage.saveConferenceSettings();

		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 5000 });
	});

	test("subtitle persists across page reloads", async ({ page }, testInfo) => {
		const testSubtitle = "E2E Test Subtitle Persistence";
		const subtitleInput = page.getByLabel("Conference Subtitle (optional)");

		await subtitleInput.fill(testSubtitle);
		await adminSettingsPage.saveConferenceSettings();
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 5000 });

		await page.reload();
		await adminSettingsPage.switchToConferenceTab(testInfo);

		await expect(subtitleInput).toHaveValue(testSubtitle);
	});

	test("subtitle is optional (can be empty)", async ({ page }) => {
		const subtitleInput = page.getByLabel("Conference Subtitle (optional)");

		await subtitleInput.clear();
		await adminSettingsPage.saveConferenceSettings();

		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 5000 });
	});

	test("timezone is editable on Conference tab and persists after save", async ({
		page,
	}, testInfo) => {
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_TIMEZONE" },
			update: { value: "America/New_York" },
			create: { key: "CONFERENCE_TIMEZONE", value: "America/New_York" },
		});
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToConferenceTab(testInfo);

		const combobox = adminSettingsPage.getTimezoneCombobox();

		await expect(combobox).toBeVisible({ timeout: 10000 });
		await expect(combobox).toHaveText(/America\/New_York/);

		await combobox.click();
		await page.getByPlaceholder("Search timezone...").fill("Europe/Warsaw");
		await page.getByRole("option", { name: "Europe/Warsaw" }).click();
		await adminSettingsPage.saveConferenceSettings();
		await expect(page.getByText("Conference settings saved")).toBeVisible({
			timeout: 10000,
		});

		await adminSettingsPage.goto();
		await adminSettingsPage.switchToConferenceTab(testInfo);
		await expect(adminSettingsPage.getTimezoneCombobox()).toHaveText(
			/Europe\/Warsaw/,
			{ timeout: 10000 },
		);
	});
});
