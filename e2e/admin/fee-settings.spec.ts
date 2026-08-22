import { test, expect, AdminSettingsPage } from "./fixtures";

/**
 * Serial — modifies shared settings
 */
test.describe("Fee Settings", () => {
	test.describe.configure({ mode: "serial" });

	test("admin configures currency", async ({ page }, testInfo) => {
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.switchToConferenceTab(testInfo);

		await page.locator("#currency").click();
		await page.getByRole("option", { name: "USD" }).click();
		await settingsPage.saveConferenceSettings();

		await expect(page.getByText("Conference settings saved")).toBeVisible({
			timeout: 10000,
		});

		await page.reload();
		await expect(
			page.getByRole("heading", { name: "Basic Information" }),
		).toBeVisible({ timeout: 10000 });
		await expect(page.locator("#currency")).toHaveText("USD");

		await page.locator("#currency").click();
		await page.getByRole("option", { name: "EUR" }).click();
		await settingsPage.saveConferenceSettings();
		await expect(page.getByText("Conference settings saved")).toBeVisible({
			timeout: 10000,
		});
	});

	test("admin creates fee type", async ({ page }, testInfo) => {
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.switchToFeeTab(testInfo);

		await page.getByRole("button", { name: "Add Fee Type" }).click();
		await page.getByLabel("Name").fill("VIP Pass");
		await page.getByLabel("Amount").fill("500");
		await page.getByRole("button", { name: "Add" }).click();

		await expect(page.getByText("Fee types saved")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("VIP Pass")).toBeVisible();
		await expect(page.getByText("500.00")).toBeVisible();
	});

	test("admin edits fee type", async ({ page }, testInfo) => {
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.switchToFeeTab(testInfo);

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

		await expect(page.getByText("Fee types saved")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("Premium Pass")).toBeVisible();
		await expect(page.getByText("600.00")).toBeVisible();
	});

	test("admin deletes fee type", async ({ page }, testInfo) => {
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.switchToFeeTab(testInfo);
		await expect(page.getByText("Premium Pass")).toBeVisible();

		await page.getByRole("button", { name: "Delete Premium Pass" }).click();

		await expect(page.getByText("Fee types saved")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("Premium Pass")).not.toBeVisible();
	});

	test("admin creates free fee type with blank amount", async ({
		page,
	}, testInfo) => {
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await settingsPage.switchToFeeTab(testInfo);

		await page.getByRole("button", { name: "Add Fee Type" }).click();
		await page.getByLabel("Name").fill("Free Pass");
		await page.getByRole("button", { name: "Add" }).click();

		await expect(page.getByText("Fee types saved")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("Free Pass")).toBeVisible();
		await expect(page.getByText("0.00", { exact: true })).toBeVisible();

		await page.getByRole("button", { name: "Delete Free Pass" }).click();
		await expect(page.getByText("Free Pass")).not.toBeVisible();
	});
});
