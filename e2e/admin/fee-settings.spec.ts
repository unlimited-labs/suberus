import { test, expect, AdminSettingsPage } from "./fixtures";

/**
 * E2E tests for Fee Settings (admin panel)
 * Tests currency configuration and fee types CRUD
 * Serial — modifies shared settings
 */
test.describe("Fee Settings", () => {
	test.describe.configure({ mode: "serial" });

	test("admin configures currency", async ({ page }, testInfo) => {
		// Arrange
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.switchToConferenceTab(testInfo);

		// Act — change currency to USD
		await page.locator("#currency").click();
		await page.getByRole("option", { name: "USD" }).click();
		await settingsPage.saveConferenceSettings();

		// Assert
		await expect(page.getByText("Conference settings saved")).toBeVisible({
			timeout: 10000,
		});

		// Verify persisted — reload
		await page.reload();
		await expect(
			page.getByRole("heading", { name: "Basic Information" }),
		).toBeVisible({ timeout: 10000 });
		await expect(page.locator("#currency")).toHaveText("USD");

		// Cleanup — restore EUR
		await page.locator("#currency").click();
		await page.getByRole("option", { name: "EUR" }).click();
		await settingsPage.saveConferenceSettings();
		await expect(page.getByText("Conference settings saved")).toBeVisible({
			timeout: 10000,
		});
	});

	test("admin creates fee type", async ({ page }, testInfo) => {
		// Arrange
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.switchToFeeTab(testInfo);

		// Act — add new fee type
		await page.getByRole("button", { name: "Add Fee Type" }).click();
		await page.getByLabel("Name").fill("VIP Pass");
		await page.getByLabel("Amount").fill("500");
		await page.getByRole("button", { name: "Add" }).click();

		// Assert
		await expect(page.getByText("Fee types saved")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("VIP Pass")).toBeVisible();
		await expect(page.getByText("500.00")).toBeVisible();
	});

	test("admin edits fee type", async ({ page }, testInfo) => {
		// Arrange
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.switchToFeeTab(testInfo);

		// Act — edit the VIP Pass fee type
		await expect(page.getByText("VIP Pass")).toBeVisible({ timeout: 10000 });
		await page.getByRole("button", { name: "Edit VIP Pass" }).click();
		const nameInput = page.getByRole("textbox", { name: "Fee type name" });
		await nameInput.clear();
		await nameInput.fill("Premium Pass");
		const amountInput = page.getByRole("spinbutton", {
			name: "Fee type amount",
		});
		await amountInput.clear();
		await amountInput.fill("600");
		await page.getByRole("button", { name: "Save", exact: true }).click();

		// Assert
		await expect(page.getByText("Fee types saved")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("Premium Pass")).toBeVisible();
		await expect(page.getByText("600.00")).toBeVisible();
	});

	test("admin deletes fee type", async ({ page }, testInfo) => {
		// Arrange
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.switchToFeeTab(testInfo);
		await expect(page.getByText("Premium Pass")).toBeVisible();

		// Act — delete the Premium Pass
		await page.getByRole("button", { name: "Delete Premium Pass" }).click();

		// Assert
		await expect(page.getByText("Fee types saved")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("Premium Pass")).not.toBeVisible();
	});
});
