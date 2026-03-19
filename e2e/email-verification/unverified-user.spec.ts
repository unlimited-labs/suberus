import {
	test,
	expect,
	UNVERIFIED_USER,
	clearMailpitForAddress,
	waitForEmail,
} from "./fixtures"

// Tests run with unverified user auth (storageState: e2e/.auth/unverified.json)

test.describe("Unverified User - Email Verification Banner", () => {
	test("shows verification banner on dashboard", async ({ page, emailBanner }) => {
		// Arrange & Act
		await page.goto("/")

		// Assert
		await emailBanner.expectVisible()
	})

	test("banner has resend button", async ({ page, emailBanner }) => {
		// Arrange
		await page.goto("/")

		// Assert
		await emailBanner.expectVisible()
		await expect(emailBanner.resendButton).toBeVisible()
	})

	test("can dismiss banner", async ({ page, emailBanner }) => {
		// Arrange
		await page.goto("/")
		await emailBanner.expectVisible()

		// Act
		await emailBanner.dismiss()

		// Assert
		await emailBanner.expectNotVisible()
	})

	test("banner stays dismissed during session", async ({ page, emailBanner }) => {
		// Arrange
		await page.goto("/")
		await emailBanner.dismiss()

		// Act
		await page.goto("/submissions")
		await page.goto("/")

		// Assert
		await emailBanner.expectNotVisible()
	})

	test("resend button sends verification email", async ({ page, emailBanner }) => {
		// Arrange
		await clearMailpitForAddress(UNVERIFIED_USER.email)
		await page.goto("/")
		await emailBanner.expectVisible()

		// Act
		await emailBanner.clickResend()

		// Assert
		await expect(page.getByText(/verification email sent/i)).toBeVisible({ timeout: 10000 })
		const email = await waitForEmail(UNVERIFIED_USER.email, "verify", 15000)
		expect(email).not.toBeNull()
	})

	test("resend button shows cooldown after click", async ({ page, emailBanner }) => {
		// Arrange
		await page.goto("/")
		await emailBanner.expectVisible()

		// Act
		await emailBanner.clickResend()

		// Assert
		await expect(emailBanner.resendButton).toContainText(/resend in \d+s/i, { timeout: 10000 })
		await expect(emailBanner.resendButton).toBeDisabled()
	})
})

test.describe("Unverified User - Submission Block", () => {
	test("shows block message on new submission page", async ({ submissionBlockPage }) => {
		// Arrange & Act
		await submissionBlockPage.goto()

		// Assert
		await submissionBlockPage.expectBlocked()
	})

	test("block message has resend button", async ({ submissionBlockPage }) => {
		// Arrange
		await submissionBlockPage.goto()

		// Assert
		await expect(submissionBlockPage.resendButton).toBeVisible()
	})

	test("resend button in block sends verification email", async ({ submissionBlockPage }) => {
		// Arrange
		await clearMailpitForAddress(UNVERIFIED_USER.email)
		await submissionBlockPage.goto()
		await submissionBlockPage.expectBlocked()

		// Act
		await submissionBlockPage.clickResend()

		// Assert
		await expect(submissionBlockPage.page.getByText(/verification email sent/i)).toBeVisible({
			timeout: 10000,
		})
		const email = await waitForEmail(UNVERIFIED_USER.email, "verify", 15000)
		expect(email).not.toBeNull()
	})

	test("submission form is not visible for unverified user", async ({ submissionBlockPage }) => {
		// Arrange
		await submissionBlockPage.goto()

		// Assert
		await expect(submissionBlockPage.page.getByLabel("Title")).not.toBeVisible()
		await expect(submissionBlockPage.page.getByLabel("Abstract")).not.toBeVisible()
	})
})

test.describe("Unverified User - Settings Page", () => {
	test("email input is disabled for unverified user", async ({ settingsEmailSection }) => {
		// Arrange & Act
		await settingsEmailSection.goto()

		// Assert
		await expect(settingsEmailSection.emailInput).toBeDisabled()
	})

	test("shows not verified status in settings", async ({ settingsEmailSection }) => {
		// Arrange & Act
		await settingsEmailSection.goto()

		// Assert
		await settingsEmailSection.expectNotVerified()
	})

	test("shows resend button in settings", async ({ settingsEmailSection }) => {
		// Arrange
		await settingsEmailSection.goto()

		// Assert
		await expect(settingsEmailSection.resendButton).toBeVisible()
	})

	test("resend button in settings sends verification email", async ({ settingsEmailSection }) => {
		// Arrange
		await clearMailpitForAddress(UNVERIFIED_USER.email)
		await settingsEmailSection.goto()

		// Act
		await settingsEmailSection.clickResend()

		// Assert
		await expect(settingsEmailSection.page.getByText(/verification email sent/i)).toBeVisible({
			timeout: 10000,
		})
		const email = await waitForEmail(UNVERIFIED_USER.email, "verify", 15000)
		expect(email).not.toBeNull()
	})
})
