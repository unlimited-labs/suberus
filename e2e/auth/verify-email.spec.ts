import { test, expect, clearMailpit, waitForEmail } from "./fixtures"

test.describe("Verify Email Page", () => {
	test("displays page correctly with email param", async ({ verifyEmailPage }) => {
		const testEmail = "test@example.com"
		await verifyEmailPage.goto(testEmail)

		await expect(verifyEmailPage.heading).toBeVisible()
		await verifyEmailPage.expectEmailDisplayed(testEmail)
		await expect(verifyEmailPage.resendButton).toBeVisible()
		await expect(verifyEmailPage.backToLoginLink).toBeVisible()
	})

	test("displays page without email param", async ({ verifyEmailPage }) => {
		await verifyEmailPage.goto()

		await expect(verifyEmailPage.heading).toBeVisible()
		// Resend button should not be visible without email
		await expect(verifyEmailPage.resendButton).not.toBeVisible()
		await expect(verifyEmailPage.backToLoginLink).toBeVisible()
	})

	test("shows verification instructions", async ({ verifyEmailPage }) => {
		await verifyEmailPage.goto("test@example.com")

		await expect(verifyEmailPage.page.getByText(/click the link in your email/i)).toBeVisible()
		await expect(verifyEmailPage.page.getByText(/expires in 24 hours/i)).toBeVisible()
	})

	test("back to login link navigates correctly", async ({ verifyEmailPage }) => {
		await verifyEmailPage.goto("test@example.com")

		await verifyEmailPage.backToLoginLink.click()

		await expect(verifyEmailPage.page).toHaveURL(/\/login/)
	})

	test("resend button is initially enabled", async ({ verifyEmailPage }) => {
		await verifyEmailPage.goto("test@example.com")

		await expect(verifyEmailPage.resendButton).toBeEnabled()
		await expect(verifyEmailPage.resendButton).toContainText(/resend email/i)
	})
})

test.describe("Verify Email Page - Resend Flow", () => {
	// Note: These tests use the banner on dashboard after registration
	// since users are now auto-logged in and redirected to /

	test.beforeEach(async () => {
		await clearMailpit()
	})

	test("resend from banner sends verification email for registered user", async ({
		registerPage,
	}) => {
		// Register a new user
		const uniqueEmail = `resend-test-${Date.now()}@e2e.local`

		await registerPage.goto()
		await registerPage.fillStep1({
			email: uniqueEmail,
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Resend",
			lastName: "Test",
			affiliation: "Test University",
		})
		await registerPage.clickContinue()
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()

		// Should be on dashboard with banner
		await expect(registerPage.page).toHaveURL("/", { timeout: 10000 })

		// Clear mailpit to only catch resend email
		await clearMailpit()

		// Click resend in banner
		const banner = registerPage.page.locator("[role='alert']").filter({ hasText: /email.*not verified/i })
		await banner.getByRole("button", { name: /resend/i }).click()

		// Should show success toast
		await expect(registerPage.page.getByText(/verification email sent/i)).toBeVisible({
			timeout: 5000,
		})

		// New email should be sent
		const email = await waitForEmail(uniqueEmail, "verify", 15000)
		expect(email).not.toBeNull()
	})

	test("resend shows cooldown after click", async ({ registerPage }) => {
		// Register a new user
		const uniqueEmail = `cooldown-test-${Date.now()}@e2e.local`

		await registerPage.goto()
		await registerPage.fillStep1({
			email: uniqueEmail,
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Cooldown",
			lastName: "Test",
			affiliation: "Test University",
		})
		await registerPage.clickContinue()
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()

		// Should be on dashboard with banner
		await expect(registerPage.page).toHaveURL("/", { timeout: 10000 })

		// Click resend in banner
		const banner = registerPage.page.locator("[role='alert']").filter({ hasText: /email.*not verified/i })
		const resendButton = banner.getByRole("button", { name: /resend/i })
		await resendButton.click()

		// Button should show cooldown and be disabled
		await expect(resendButton).toContainText(/resend in \d+s/i, { timeout: 5000 })
		await expect(resendButton).toBeDisabled()
	})
})
