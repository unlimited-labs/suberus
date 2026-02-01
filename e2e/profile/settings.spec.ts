import { test, expect, TEST_USER, VALID_ORCID } from "./fixtures"

test.describe("User Settings", () => {
	// storageState is already set in playwright.config.ts for profile tests

	test("displays settings page with all sections", async ({ settingsPage }) => {
		await settingsPage.goto()

		// Check main heading
		await expect(settingsPage.heading).toBeVisible()

		// Check personal info section
		await expect(settingsPage.firstNameInput).toBeVisible()
		await expect(settingsPage.lastNameInput).toBeVisible()
		await expect(settingsPage.orcidInput).toBeVisible()
		await expect(settingsPage.savePersonalBtn).toBeVisible()

		// Check contact info section
		await expect(settingsPage.addressInput).toBeVisible()
		await expect(settingsPage.saveContactBtn).toBeVisible()

		// Check password section
		await expect(settingsPage.currentPasswordInput).toBeVisible()
		await expect(settingsPage.newPasswordInput).toBeVisible()
		await expect(settingsPage.confirmPasswordInput).toBeVisible()
		await expect(settingsPage.changePasswordBtn).toBeVisible()
	})

	test("shows initial user data in personal info form", async ({ settingsPage }) => {
		await settingsPage.goto()

		// Check that user data is pre-filled
		await expect(settingsPage.firstNameInput).toHaveValue(TEST_USER.firstName)
		await expect(settingsPage.lastNameInput).toHaveValue(TEST_USER.lastName)
	})

	test("validates required fields in personal info", async ({ settingsPage }) => {
		await settingsPage.goto()

		// Clear required fields
		await settingsPage.fillPersonalInfo({ firstName: "", lastName: "" })
		await settingsPage.savePersonalInfo()

		// Should show validation errors
		await expect(settingsPage.page.getByText(/first name.*required/i)).toBeVisible()
		await expect(settingsPage.page.getByText(/last name.*required/i)).toBeVisible()
	})

	test("validates ORCID format", async ({ settingsPage }) => {
		await settingsPage.goto()

		// Fill invalid ORCID
		await settingsPage.fillPersonalInfo({ orcid: "invalid-orcid" })
		await settingsPage.savePersonalInfo()

		// Should show ORCID format error
		await expect(settingsPage.page.getByText(/invalid orcid format/i)).toBeVisible()
	})

	test("updates personal info successfully", async ({ settingsPage }) => {
		await settingsPage.goto()

		// Update personal info with ORCID
		await settingsPage.fillPersonalInfo({
			orcid: VALID_ORCID,
		})
		await settingsPage.savePersonalInfo()

		// Should show success toast
		await settingsPage.expectToastSuccess(/personal information updated/i)
	})

	test("updates contact info successfully", async ({ settingsPage }) => {
		await settingsPage.goto()

		// Update contact info
		await settingsPage.fillContactInfo({
			address: "123 Test Street\nTest City",
			country: "Poland",
		})
		await settingsPage.saveContactInfo()

		// Should show success toast
		await settingsPage.expectToastSuccess(/contact information updated/i)
	})

	test("validates empty password fields", async ({ settingsPage }) => {
		await settingsPage.goto()

		// Try empty passwords
		await settingsPage.submitPasswordChange()
		await expect(settingsPage.page.getByText(/current password is required/i)).toBeVisible()
	})

	test("validates short password", async ({ settingsPage }) => {
		await settingsPage.goto()

		// Try short password
		await settingsPage.fillPasswordChange({
			currentPassword: "current",
			newPassword: "short",
			confirmPassword: "short",
		})
		await settingsPage.submitPasswordChange()
		await expect(settingsPage.page.getByText(/at least 10 characters/i)).toBeVisible()
	})

	test("validates password confirmation match", async ({ settingsPage }) => {
		await settingsPage.goto()

		// Fill mismatched passwords
		await settingsPage.fillPasswordChange({
			currentPassword: "currentpass",
			newPassword: "newpassword123",
			confirmPassword: "different123",
		})
		await settingsPage.submitPasswordChange()

		// Should show mismatch error
		await expect(settingsPage.page.getByText(/passwords do not match/i)).toBeVisible()
	})
})
