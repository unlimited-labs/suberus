import { AdminSettingsPage, expect, test } from "./fixtures";

/**
 * "Finances enabled" toggle (admin Settings › Finances tab). Verifies the switch
 * gates the admin Finances sidebar link live (shared-QueryClient invalidation),
 * and persists across reload. Default is OFF. Serial — mutates FINANCES_ENABLED;
 * restores it to off.
 */
test.describe("Finances enabled toggle", () => {
	test.describe.configure({ mode: "serial" });

	const financesLink = (page: AdminSettingsPage["page"]) =>
		page.getByRole("link", { name: "Finances", exact: true });
	const financesSwitch = (page: AdminSettingsPage["page"]) =>
		page.getByRole("switch", { name: "Finances enabled" });
	const openTab = async (page: AdminSettingsPage["page"]) => {
		await page.getByTestId("settings-tab-finances").click();
		await expect(financesSwitch(page)).toBeVisible();
	};

	test("toggling on shows the Finances link, off hides it (no reload)", async ({
		page,
	}) => {
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await expect(financesLink(page)).not.toBeVisible();
		await openTab(page);
		await expect(financesSwitch(page)).not.toBeChecked();

		await financesSwitch(page).click();
		await expect(page.getByText("Finances enabled")).toBeVisible({
			timeout: 10000,
		});
		await expect(financesLink(page)).toBeVisible();

		// VAT table appears when enabled, with the two default rates
		await expect(page.getByTestId("vat-row-8")).toBeVisible();
		await expect(page.getByTestId("vat-row-23")).toBeVisible();

		await financesSwitch(page).click();
		await expect(page.getByText("Finances disabled")).toBeVisible({
			timeout: 10000,
		});
		await expect(financesLink(page)).not.toBeVisible();
		await expect(page.getByTestId("vat-row-8")).not.toBeVisible();
	});

	test("enabled state persists across reload, then restore to off", async ({
		page,
	}) => {
		const settingsPage = new AdminSettingsPage(page);
		await settingsPage.goto();
		await openTab(page);

		await financesSwitch(page).click();
		await expect(page.getByText("Finances enabled")).toBeVisible({
			timeout: 10000,
		});
		await page.reload();
		await openTab(page);
		await expect(financesSwitch(page)).toBeChecked();
		await expect(financesLink(page)).toBeVisible();

		// Cleanup — restore default (off)
		await financesSwitch(page).click();
		await expect(page.getByText("Finances disabled")).toBeVisible({
			timeout: 10000,
		});
		await expect(financesLink(page)).not.toBeVisible();
	});
});
