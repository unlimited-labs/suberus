import { test, expect, SettingsPage } from "./fixtures"
import { UNVERIFIED_USER, TEST_USER } from "../helpers/test-users"
import { loginAs } from "../helpers/auth"

test.describe("Email Change", () => {
	test("shows email change warning when email is modified", async ({
		settingsPage,
	}) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.emailInput.clear()
		await settingsPage.emailInput.fill("newemail@example.com")

		// Assert
		await expect(
			settingsPage.page.getByText(/changing your email requires verification/i),
		).toBeVisible()
		await expect(settingsPage.emailVerifiedBadge).not.toBeVisible()
	})

	test("warning disappears when email is reverted to original", async ({
		settingsPage,
	}) => {
		// Arrange
		await settingsPage.goto()
		const originalEmail = await settingsPage.emailInput.inputValue()

		// Act - change email
		await settingsPage.emailInput.clear()
		await settingsPage.emailInput.fill("changed@example.com")
		await expect(
			settingsPage.page.getByText(/changing your email requires verification/i),
		).toBeVisible()

		// Act - revert email
		await settingsPage.emailInput.clear()
		await settingsPage.emailInput.fill(originalEmail)

		// Assert
		await expect(
			settingsPage.page.getByText(/changing your email requires verification/i),
		).not.toBeVisible()
		await expect(settingsPage.emailVerifiedBadge).toBeVisible()
	})

	test("email change requires password and succeeds with correct one", async ({
		settingsPage,
	}) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.changeEmail("new-address@example.com", TEST_USER.password)

		// Assert
		await settingsPage.expectToastSuccess(/verification email sent/i)
		await expect(settingsPage.emailChangeDialog).not.toBeVisible()
	})

	test("email change is rejected with a wrong password", async ({
		settingsPage,
	}) => {
		// Arrange
		await settingsPage.goto()

		// Act
		await settingsPage.changeEmail("attacker@example.com", "wrong-password")

		// Assert
		await settingsPage.expectToastError(/incorrect password/i)
		await expect(settingsPage.emailChangeDialog).toBeVisible()
	})

	test("email field is disabled for unverified user", async ({ page }) => {
		// Arrange
		await loginAs(page, UNVERIFIED_USER, { clearCookies: true })
		const settingsPage = new SettingsPage(page)
		await settingsPage.goto()

		// Assert
		await expect(settingsPage.emailInput).toBeDisabled()
		await expect(settingsPage.emailNotVerifiedBadge).toBeVisible()
		await expect(settingsPage.emailResendButton).toBeVisible()
	})
})
