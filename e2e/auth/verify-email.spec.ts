import { test, expect, clearMailpitForAddress, waitForEmail, getMailpitMessage } from "./fixtures"

test.describe("Verify Email Page", () => {
	test("displays page correctly with email param", async ({ verifyEmailPage }) => {
		// Arrange
		const testEmail = "test@example.com"
		await verifyEmailPage.goto(testEmail)

		// Assert
		await expect(verifyEmailPage.heading).toBeVisible()
		await verifyEmailPage.expectEmailDisplayed(testEmail)
		await expect(verifyEmailPage.resendButton).toBeVisible()
		await expect(verifyEmailPage.backToLoginLink).toBeVisible()
	})

	test("displays page without email param", async ({ verifyEmailPage }) => {
		// Arrange
		await verifyEmailPage.goto()

		// Assert
		await expect(verifyEmailPage.heading).toBeVisible()
		await expect(verifyEmailPage.resendButton).not.toBeVisible()
		await expect(verifyEmailPage.backToLoginLink).toBeVisible()
	})

	test("shows verification instructions", async ({ verifyEmailPage }) => {
		// Arrange
		await verifyEmailPage.goto("test@example.com")

		// Assert
		await expect(verifyEmailPage.page.getByText(/click the link in your email/i)).toBeVisible()
		await expect(verifyEmailPage.page.getByText(/expires in 24 hours/i)).toBeVisible()
	})

	test("back to login link navigates correctly", async ({ verifyEmailPage }) => {
		// Arrange
		await verifyEmailPage.goto("test@example.com")

		// Act
		await verifyEmailPage.backToLoginLink.click()

		// Assert
		await expect(verifyEmailPage.page).toHaveURL(/\/login/)
	})

	test("resend button is initially enabled", async ({ verifyEmailPage }) => {
		// Arrange
		await verifyEmailPage.goto("test@example.com")

		// Assert
		await expect(verifyEmailPage.resendButton).toBeEnabled()
		await expect(verifyEmailPage.resendButton).toContainText(/resend email/i)
	})
})

test.describe("Verify Email - Verification Link", () => {
	test("clicking verification link verifies email and removes banner", async ({
		registerPage,
		testRun,
		page,
	}) => {
		test.slow() // 3-step registration + email wait + verification
		// Arrange - register new user
		const uniqueEmail = `verify-link-${testRun.testRunId}@e2e.local`
		await registerPage.goto()
		await registerPage.fillStep1({
			email: uniqueEmail,
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Verify",
			lastName: "Link",
			affiliation: "Test University",
		})
		await registerPage.clickContinue()
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()
		await expect(page).toHaveURL("/", { timeout: 15000 })

		// Assert precondition - unverified banner is visible
		const banner = page.locator("[role='alert']").filter({ hasText: /email.*not verified/i })
		await expect(banner).toBeVisible({ timeout: 5000 })

		// Wait for verification email
		const email = await waitForEmail(uniqueEmail, "verify", 15000)
		expect(email).not.toBeNull()

		// Extract verification URL from email body
		const emailDetails = await getMailpitMessage(email!.ID)
		expect(emailDetails).not.toBeNull()
		const urlMatch = emailDetails!.Text.match(/https?:\/\/[^\s]+verify[^\s]+/)
		expect(urlMatch).not.toBeNull()
		const verificationUrl = urlMatch![0]

		// Act - navigate to verification URL
		await page.goto(verificationUrl)
		// Wait for redirect to complete
		await page.waitForURL(/\//, { timeout: 15000 })

		// Navigate to dashboard fresh to verify banner is gone
		await page.goto("/")
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })

		// Assert - unverified banner should NOT be visible anymore
		await expect(banner).not.toBeVisible({ timeout: 5000 })
	})
})

test.describe("Verify Email Page - Resend Flow", () => {
	// Note: These tests use the banner on dashboard after registration
	// since users are now auto-logged in and redirected to /

	test("resend from banner sends verification email for registered user", async ({
		registerPage,
		testRun,
	}) => {
		test.slow(); // 3-step registration + resend email wait
		// Arrange
		const uniqueEmail = `resend-${testRun.testRunId}@e2e.local`
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
		await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })
		// Clear only emails for this specific address (not all emails)
		await clearMailpitForAddress(uniqueEmail)

		// Act
		const banner = registerPage.page.locator("[role='alert']").filter({ hasText: /email.*not verified/i })
		await expect(banner).toBeVisible({ timeout: 5000 })
		await banner.getByRole("button", { name: /resend/i }).click()

		// Assert
		await expect(registerPage.page.getByText(/verification email sent/i)).toBeVisible({
			timeout: 10000,
		})
		const email = await waitForEmail(uniqueEmail, "verify", 15000)
		expect(email).not.toBeNull()
	})

	test("resend shows cooldown after click", async ({ registerPage, testRun }) => {
		test.slow(); // Full 3-step registration form under load
		// Arrange
		const uniqueEmail = `cooldown-${testRun.testRunId}@e2e.local`
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
		await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })

		// Act
		const banner = registerPage.page.locator("[role='alert']").filter({ hasText: /email.*not verified/i })
		await expect(banner).toBeVisible({ timeout: 5000 })
		const resendButton = banner.getByRole("button", { name: /resend/i })
		await resendButton.click()

		// Assert
		await expect(resendButton).toContainText(/resend in \d+s/i, { timeout: 10000 })
		await expect(resendButton).toBeDisabled()
	})
})
