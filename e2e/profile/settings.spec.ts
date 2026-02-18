import { test, expect, TEST_USER, VALID_ORCID } from "./fixtures"

const TEST_EMAIL = TEST_USER.email

test.describe("User Settings", () => {
	// storageState is already set in playwright.config.ts for profile tests

	test("displays settings page with all sections", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Assert
		await expect(settingsPage.heading).toBeVisible()
		await expect(settingsPage.firstNameInput).toBeVisible()
		await expect(settingsPage.lastNameInput).toBeVisible()
		await expect(settingsPage.orcidInput).toBeVisible()
		await expect(settingsPage.savePersonalBtn).toBeVisible()
		await expect(settingsPage.addressInput).toBeVisible()
		await expect(settingsPage.saveContactBtn).toBeVisible()
		await expect(settingsPage.currentPasswordInput).toBeVisible()
		await expect(settingsPage.newPasswordInput).toBeVisible()
		await expect(settingsPage.confirmPasswordInput).toBeVisible()
		await expect(settingsPage.changePasswordBtn).toBeVisible()
	})

	test("shows initial user data in personal info form", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Assert
		await expect(settingsPage.firstNameInput).toHaveValue(TEST_USER.firstName)
		await expect(settingsPage.lastNameInput).toHaveValue(TEST_USER.lastName)
	})

	test("validates required fields in personal info", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.fillPersonalInfo({ firstName: "", lastName: "" })
		await settingsPage.savePersonalInfo()

		// Assert
		await expect(settingsPage.page.getByText(/first name.*required/i)).toBeVisible()
		await expect(settingsPage.page.getByText(/last name.*required/i)).toBeVisible()
	})

	test("validates ORCID format", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.fillPersonalInfo({ orcid: "invalid-orcid" })
		await settingsPage.savePersonalInfo()

		// Assert
		await expect(settingsPage.page.getByText(/invalid orcid format/i)).toBeVisible()
	})

	test("updates personal info successfully", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.fillPersonalInfo({
			orcid: VALID_ORCID,
		})
		await settingsPage.savePersonalInfo()

		// Assert
		await settingsPage.expectToastSuccess(/personal information updated/i)
	})

	test("updates contact info successfully", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.fillContactInfo({
			address: "123 Test Street\nTest City",
			country: "Poland",
		})
		await settingsPage.saveContactInfo()

		// Assert
		await settingsPage.expectToastSuccess(/contact information updated/i)
	})

	test("validates empty password fields", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.submitPasswordChange()

		// Assert
		await expect(settingsPage.page.getByText(/current password is required/i)).toBeVisible()
	})

	test("validates short password", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.fillPasswordChange({
			currentPassword: "current",
			newPassword: "short",
			confirmPassword: "short",
		})
		await settingsPage.submitPasswordChange()

		// Assert
		await expect(settingsPage.page.getByText(/at least 10 characters/i)).toBeVisible()
	})

	test("validates password confirmation match", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.fillPasswordChange({
			currentPassword: "currentpass",
			newPassword: "newpassword123",
			confirmPassword: "different123",
		})
		await settingsPage.submitPasswordChange()

		// Assert
		await expect(settingsPage.page.getByText(/passwords do not match/i)).toBeVisible()
	})

	test("shows email verified status for verified user", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Assert
		await expect(settingsPage.emailVerifiedBadge).toBeVisible()
		await expect(settingsPage.emailResendButton).not.toBeVisible()
	})

	test("sidebar user menu does not show email address", async ({ settingsPage }) => {
		// Arrange
		await settingsPage.goto()

		// Assert
		const trigger = settingsPage.page.locator("[class*='sidebar']").getByText(TEST_EMAIL)
		await expect(trigger).not.toBeVisible()
	})

	test("shows already-verified toast for reused verification link", async ({ settingsPage }) => {
		// Arrange & Act
		await settingsPage.page.goto("/?verified=true&error=INVALID_TOKEN")

		// Assert
		await expect(
			settingsPage.page.locator("[data-sonner-toast]").getByText("Email is already verified")
		).toBeVisible({ timeout: 5000 })
	})
})
