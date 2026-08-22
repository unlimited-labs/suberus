import { test, expect, clearMailpitForAddress, waitForEmail, getMailpitMessage } from "./fixtures"

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

test.describe("Verify Email - Verification Link", () => {
	test("clicking verification link verifies email and removes banner", async ({
		registerPage,
		testRun,
		page,
	}) => {
		test.slow() // 3-step registration + email wait + verification
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
		await registerPage.fillStep2({ country: "Poland", address: "Test Org\n123 Test St" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()
		await expect(page).toHaveURL("/", { timeout: 15000 })

		const banner = page.locator("[role='alert']").filter({ hasText: /email.*not verified/i })
		await expect(banner).toBeVisible({ timeout: 5000 })

		const email = await waitForEmail(uniqueEmail, "verify", 15000)
		expect(email).not.toBeNull()

		const emailDetails = await getMailpitMessage(email!.ID)
		expect(emailDetails).not.toBeNull()
		const urlMatch = emailDetails!.Text.match(/https?:\/\/[^\s]+verify[^\s]+/)
		expect(urlMatch).not.toBeNull()
		const verificationUrl = urlMatch![0]

		await page.goto(verificationUrl)
		await page.waitForURL(/\//, { timeout: 15000 })

		await page.goto("/")
		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })

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
		await registerPage.fillStep2({ country: "Poland", address: "Test Org\n123 Test St" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()
		await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })
		// Clear only emails for this specific address (not all emails)
		await clearMailpitForAddress(uniqueEmail)

		const banner = registerPage.page.locator("[role='alert']").filter({ hasText: /email.*not verified/i })
		await expect(banner).toBeVisible({ timeout: 5000 })
		await banner.getByRole("button", { name: /resend/i }).click()

		await expect(registerPage.page.getByText(/verification email sent/i)).toBeVisible({
			timeout: 10000,
		})
		const email = await waitForEmail(uniqueEmail, "verify", 15000)
		expect(email).not.toBeNull()
	})

	test("resend shows cooldown after click", async ({ registerPage, testRun }) => {
		test.slow(); // Full 3-step registration form under load
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
		await registerPage.fillStep2({ country: "Poland", address: "Test Org\n123 Test St" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()
		await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })

		const banner = registerPage.page.locator("[role='alert']").filter({ hasText: /email.*not verified/i })
		await expect(banner).toBeVisible({ timeout: 5000 })
		const resendButton = banner.getByRole("button", { name: /resend/i })
		await resendButton.click()

		await expect(resendButton).toContainText(/resend in \d+s/i, { timeout: 10000 })
		await expect(resendButton).toBeDisabled()
	})
})
