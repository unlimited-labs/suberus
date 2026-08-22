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
		await page.goto("/")

		await emailBanner.expectVisible()
	})

	test("banner has resend button", async ({ page, emailBanner }) => {
		await page.goto("/")

		await emailBanner.expectVisible()
		await expect(emailBanner.resendButton).toBeVisible()
	})

	test("can dismiss banner", async ({ page, emailBanner }) => {
		await page.goto("/")
		await emailBanner.expectVisible()

		await emailBanner.dismiss()

		await emailBanner.expectNotVisible()
	})

	test("banner stays dismissed during session", async ({ page, emailBanner }) => {
		await page.goto("/")
		await emailBanner.dismiss()

		await page.goto("/submissions")
		await page.goto("/")

		await emailBanner.expectNotVisible()
	})

	test("resend button sends verification email", async ({ page, emailBanner }) => {
		await clearMailpitForAddress(UNVERIFIED_USER.email)
		await page.goto("/")
		await emailBanner.expectVisible()

		await emailBanner.clickResend()

		await expect(page.getByText(/verification email sent/i)).toBeVisible({ timeout: 10000 })
		const email = await waitForEmail(UNVERIFIED_USER.email, "verify", 15000)
		expect(email).not.toBeNull()
	})

	test("resend button shows cooldown after click", async ({ page, emailBanner }) => {
		await page.goto("/")
		await emailBanner.expectVisible()

		await emailBanner.clickResend()

		await expect(emailBanner.resendButton).toContainText(/resend in \d+s/i, { timeout: 10000 })
		await expect(emailBanner.resendButton).toBeDisabled()
	})
})

test.describe("Unverified User - Submission Block", () => {
	test("shows block message on new submission page", async ({ submissionBlockPage }) => {
		await submissionBlockPage.goto()

		await submissionBlockPage.expectBlocked()
	})

	test("block message has resend button", async ({ submissionBlockPage }) => {
		await submissionBlockPage.goto()

		await expect(submissionBlockPage.resendButton).toBeVisible()
	})

	test("resend button in block sends verification email", async ({ submissionBlockPage }) => {
		await clearMailpitForAddress(UNVERIFIED_USER.email)
		await submissionBlockPage.goto()
		await submissionBlockPage.expectBlocked()

		await submissionBlockPage.clickResend()

		await expect(submissionBlockPage.page.getByText(/verification email sent/i)).toBeVisible({
			timeout: 10000,
		})
		const email = await waitForEmail(UNVERIFIED_USER.email, "verify", 15000)
		expect(email).not.toBeNull()
	})

	test("submission form is not visible for unverified user", async ({ submissionBlockPage }) => {
		await submissionBlockPage.goto()

		await expect(submissionBlockPage.page.getByLabel("Title")).not.toBeVisible()
		await expect(submissionBlockPage.page.getByLabel("Abstract")).not.toBeVisible()
	})
})

test.describe("Unverified User - Settings Page", () => {
	test("email input is disabled for unverified user", async ({ settingsEmailSection }) => {
		await settingsEmailSection.goto()

		await expect(settingsEmailSection.emailInput).toBeDisabled()
	})

	test("shows not verified status in settings", async ({ settingsEmailSection }) => {
		await settingsEmailSection.goto()

		await settingsEmailSection.expectNotVerified()
	})

	test("shows resend button in settings", async ({ settingsEmailSection }) => {
		await settingsEmailSection.goto()

		await expect(settingsEmailSection.resendButton).toBeVisible()
	})

	test("resend button in settings sends verification email", async ({ settingsEmailSection }) => {
		await clearMailpitForAddress(UNVERIFIED_USER.email)
		await settingsEmailSection.goto()

		await settingsEmailSection.clickResend()

		await expect(settingsEmailSection.page.getByText(/verification email sent/i)).toBeVisible({
			timeout: 10000,
		})
		const email = await waitForEmail(UNVERIFIED_USER.email, "verify", 15000)
		expect(email).not.toBeNull()
	})
})
