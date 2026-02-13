import { expect, test } from "@playwright/test";
import { AdminSettingsPage } from "./fixtures";
import { getPrisma } from "../helpers/test-db";

const FORMAT_KEYS = ["DATE_FORMAT", "TIME_FORMAT"] as const;
type FormatKey = (typeof FORMAT_KEYS)[number];

test.describe.serial("Admin - Date/Time Format", () => {
	let adminSettingsPage: AdminSettingsPage;
	let originalValues: Map<FormatKey, string | null>;

	test.beforeAll(async () => {
		const db = getPrisma();
		originalValues = new Map();
		for (const key of FORMAT_KEYS) {
			const setting = await db.appSetting.findUnique({ where: { key } });
			originalValues.set(key, (setting?.value as string) ?? null);
		}
	});

	test.afterAll(async () => {
		const db = getPrisma();
		for (const [key, value] of originalValues) {
			if (value === null) {
				await db.appSetting.deleteMany({ where: { key } });
			} else {
				await db.appSetting.upsert({
					where: { key },
					update: { value },
					create: { key, value },
				});
			}
		}
	});

	test.beforeEach(async ({ page }, testInfo) => {
		adminSettingsPage = new AdminSettingsPage(page);
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToConferenceTab(testInfo);
	});

	test("date format select visible in conference settings", async ({ page }) => {
		// Assert
		await expect(page.getByRole("heading", { name: "Display Format" })).toBeVisible();
		await expect(page.getByLabel("Date Format")).toBeVisible();
	});

	test("can change date format", async ({ page }) => {
		// Arrange
		const select = adminSettingsPage.getDateFormatSelect();

		// Act
		await select.click();
		await page.getByRole("option", { name: "02/13/2026" }).click();
		await adminSettingsPage.saveConferenceSettings();

		// Assert
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("date format persists after reload", async ({ page }, testInfo) => {
		// Act
		await page.reload();
		await adminSettingsPage.switchToConferenceTab(testInfo);

		// Assert - the select should show the previously saved MM/DD/YYYY format label
		await expect(adminSettingsPage.getDateFormatSelect()).toContainText("02/13/2026");
	});

	test("time format radio buttons visible", async ({ page }) => {
		// Assert
		await expect(page.getByText("Time Format")).toBeVisible();
		await expect(page.getByText("24h (14:30)")).toBeVisible();
		await expect(page.getByText("12h (2:30 PM)")).toBeVisible();
	});

	test("can switch time format to 12h", async ({ page }) => {
		// Act
		await adminSettingsPage.getTimeFormatRadio("12h").click();
		await adminSettingsPage.saveConferenceSettings();

		// Assert
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("time format persists after reload", async ({ page }, testInfo) => {
		// Act
		await page.reload();
		await adminSettingsPage.switchToConferenceTab(testInfo);

		// Assert
		await expect(adminSettingsPage.getTimeFormatRadio("12h")).toBeChecked();
	});
});
