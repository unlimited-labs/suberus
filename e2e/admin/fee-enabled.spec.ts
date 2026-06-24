import { test, expect, AdminSettingsPage } from "./fixtures"

/**
 * E2E tests for the "Fee enabled" toggle (admin Fee settings tab).
 * Verifies the switch gates the user-facing Fee sidebar link, and that the
 * link appears/disappears live (no page reload) via shared-QueryClient invalidation.
 * Serial — mutates the shared FEE_ENABLED setting; restores it at the end.
 */
test.describe("Fee enabled toggle", () => {
	test.describe.configure({ mode: "serial" })

	const feeLink = (page: AdminSettingsPage["page"]) =>
		page.getByRole("link", { name: "Fee", exact: true })
	const feeSwitch = (page: AdminSettingsPage["page"]) =>
		page.getByRole("switch", { name: "Fee enabled" })

	test("default on: Fee link visible and switch checked", async ({
		page,
	}, testInfo) => {
		const settingsPage = new AdminSettingsPage(page)
		await settingsPage.goto()
		await expect(feeLink(page)).toBeVisible()

		await settingsPage.switchToFeeTab(testInfo)
		await expect(feeSwitch(page)).toBeChecked()
	})

	test("toggling off hides the Fee link without reload", async ({
		page,
	}, testInfo) => {
		const settingsPage = new AdminSettingsPage(page)
		await settingsPage.goto()
		await settingsPage.switchToFeeTab(testInfo)
		await expect(feeLink(page)).toBeVisible()

		// Act — disable fee
		await feeSwitch(page).click()
		await expect(page.getByText("Fee disabled")).toBeVisible({ timeout: 10000 })

		// Assert — link gone, NO reload in between
		await expect(feeLink(page)).not.toBeVisible()

		// Re-enable — link reappears, still no reload
		await feeSwitch(page).click()
		await expect(page.getByText("Fee enabled")).toBeVisible({ timeout: 10000 })
		await expect(feeLink(page)).toBeVisible()
	})

	test("disabled state persists across reload, then restore", async ({
		page,
	}, testInfo) => {
		const settingsPage = new AdminSettingsPage(page)
		await settingsPage.goto()
		await settingsPage.switchToFeeTab(testInfo)

		// Disable + reload
		await feeSwitch(page).click()
		await expect(page.getByText("Fee disabled")).toBeVisible({ timeout: 10000 })
		await page.reload()
		await settingsPage.switchToFeeTab(testInfo)
		await expect(feeSwitch(page)).not.toBeChecked()
		await expect(feeLink(page)).not.toBeVisible()

		// Cleanup — restore enabled for other suites
		await feeSwitch(page).click()
		await expect(page.getByText("Fee enabled")).toBeVisible({ timeout: 10000 })
		await expect(feeLink(page)).toBeVisible()
	})
})
