import { test, expect } from "./fixtures"

test.describe("Profile billing persistence", () => {
	// storageState is already set in playwright.config.ts for profile tests.
	// TEST_USER is seeded with needInvoice: true.

	test("persists need-invoice toggle across reload", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()
		await expect(settingsPage.needInvoiceCheckbox).toBeChecked()

		// Act: uncheck and save
		await settingsPage.needInvoiceCheckbox.click()
		await settingsPage.saveContactInfo()
		await settingsPage.expectToastSuccess(/contact information updated/i)

		// Assert: stays unchecked after reload
		await settingsPage.goto()
		await expect(settingsPage.needInvoiceCheckbox).not.toBeChecked()

		// Restore: re-check and save (keeps seeded state for other tests)
		await settingsPage.needInvoiceCheckbox.click()
		await settingsPage.saveContactInfo()
		await settingsPage.expectToastSuccess(/contact information updated/i)

		// Assert: stays checked after reload
		await settingsPage.goto()
		await expect(settingsPage.needInvoiceCheckbox).toBeChecked()
	})

	test("persists billing details across reload", async ({ settingsPage }) => {
		// Arrange
		const address = "456 Invoice Ave\nBilling City"
		const country = "Poland"
		await settingsPage.goto()

		// Act
		await settingsPage.fillContactInfo({ address, country })
		await settingsPage.saveContactInfo()
		await settingsPage.expectToastSuccess(/contact information updated/i)

		// Assert: values survive a reload
		await settingsPage.goto()
		await expect(settingsPage.needInvoiceCheckbox).toBeChecked()
		await expect(settingsPage.addressInput).toHaveValue(address)
		await expect(settingsPage.countryButton).toContainText(country)
	})
})
