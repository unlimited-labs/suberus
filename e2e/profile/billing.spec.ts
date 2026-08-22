import { test, expect } from "./fixtures"

test.describe("Profile billing persistence", () => {
	// storageState is already set in playwright.config.ts for profile tests.
	// TEST_USER is seeded with needInvoice: true.

	test("persists need-invoice toggle across reload", async ({ settingsPage }) => {
		await settingsPage.goto()
		await expect(settingsPage.needInvoiceCheckbox).toBeChecked()

		await settingsPage.needInvoiceCheckbox.click()
		await settingsPage.saveContactInfo()
		await settingsPage.expectToastSuccess(/contact information updated/i)

		await settingsPage.goto()
		await expect(settingsPage.needInvoiceCheckbox).not.toBeChecked()

		await settingsPage.needInvoiceCheckbox.click()
		await settingsPage.saveContactInfo()
		await settingsPage.expectToastSuccess(/contact information updated/i)

		await settingsPage.goto()
		await expect(settingsPage.needInvoiceCheckbox).toBeChecked()
	})

	test("persists billing details across reload", async ({ settingsPage }) => {
		const address = "456 Invoice Ave\nBilling City"
		const country = "Poland"
		await settingsPage.goto()

		await settingsPage.fillContactInfo({ address, country })
		await settingsPage.saveContactInfo()
		await settingsPage.expectToastSuccess(/contact information updated/i)

		await settingsPage.goto()
		await expect(settingsPage.needInvoiceCheckbox).toBeChecked()
		await expect(settingsPage.addressInput).toHaveValue(address)
		await expect(settingsPage.countryButton).toContainText(country)
	})
})
