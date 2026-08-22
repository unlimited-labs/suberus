import { test, expect, AdminSettingsPage } from "./fixtures"

/**
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

		await feeSwitch(page).click()
		await expect(page.getByText("Fee disabled")).toBeVisible({ timeout: 10000 })

		await expect(feeLink(page)).not.toBeVisible()

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

		await feeSwitch(page).click()
		await expect(page.getByText("Fee disabled")).toBeVisible({ timeout: 10000 })
		await page.reload()
		await settingsPage.switchToFeeTab(testInfo)
		await expect(feeSwitch(page)).not.toBeChecked()
		await expect(feeLink(page)).not.toBeVisible()

		await feeSwitch(page).click()
		await expect(page.getByText("Fee enabled")).toBeVisible({ timeout: 10000 })
		await expect(feeLink(page)).toBeVisible()
	})
})
