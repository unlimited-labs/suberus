import { expect, test } from "../helpers/base-fixtures";
import { AdminSettingsPage } from "./fixtures";
import { snapshotAppSettings } from "../helpers/test-db";

const FORMAT_KEYS = ["DATE_FORMAT", "TIME_FORMAT"] as const;

test.describe.serial("Admin - Date/Time Format", () => {
	let adminSettingsPage: AdminSettingsPage;
	let restoreSettings: () => Promise<void>;

	test.beforeAll(async () => {
		({ restore: restoreSettings } = await snapshotAppSettings(FORMAT_KEYS));
	});

	test.afterAll(async () => {
		await restoreSettings();
	});

	test.beforeEach(async ({ page }, testInfo) => {
		adminSettingsPage = new AdminSettingsPage(page);
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToConferenceTab(testInfo);
	});

	test("date format select visible in conference settings", async ({ page }) => {
		// Assert
		await expect(page.getByRole("heading", { name: "Date & Time" })).toBeVisible();
		await expect(page.getByLabel("Date Format")).toBeVisible();
	});

	test("can change date format", async ({ page }) => {
		// Arrange
		const select = adminSettingsPage.getDateFormatSelect();

		// Act - select by stable testid: the MM/DD/YYYY and DD/MM/YYYY previews
		// are identical whenever day === month (e.g. 06/06), so option text is ambiguous.
		await select.click();
		await page.getByTestId("date-format-option-MM/DD/YYYY").click();
		await adminSettingsPage.saveConferenceSettings();

		// Assert
		await expect(page.getByText("Conference settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("date format persists after reload", async ({ page }, testInfo) => {
		// Act
		await page.reload();
		await adminSettingsPage.switchToConferenceTab(testInfo);

		// Assert - the select should show the previously saved MM/DD/YYYY format label.
		// The page renders the preview in UTC (Playwright timezoneId), so build the
		// expected date in UTC too — otherwise the local vs UTC date boundary flips
		// the day near midnight UTC and the comparison is off by one.
		const now = new Date();
		const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
		const dd = String(now.getUTCDate()).padStart(2, "0");
		const yyyy = now.getUTCFullYear();
		await expect(adminSettingsPage.getDateFormatSelect()).toContainText(`${mm}/${dd}/${yyyy}`);
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
