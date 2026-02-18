import { test as base, expect as baseExpect, type Page, type Locator } from "@playwright/test"
import { dismissViteOverlay } from "../helpers/page-setup"

export { UNVERIFIED_USER, TEST_USER } from "../helpers/test-users"
export { clearMailpit, clearMailpitForAddress, getMailpitMessages, getMailpitMessage, waitForEmail } from "../helpers/mailpit"

// Page Objects
export class VerifyEmailPage {
	readonly page: Page
	readonly heading: Locator
	readonly emailIcon: Locator
	readonly resendButton: Locator
	readonly backToLoginLink: Locator

	constructor(page: Page) {
		this.page = page
		this.heading = page.getByRole("heading", { name: "Check your email" })
		this.emailIcon = page.locator("svg.size-12")
		this.resendButton = page.getByRole("button", { name: /resend/i })
		this.backToLoginLink = page.getByRole("link", { name: "Back to login" })
	}

	async goto(email?: string) {
		const url = email ? `/verify-email?email=${encodeURIComponent(email)}` : "/verify-email"
		await this.page.goto(url)
	}

	async expectEmailDisplayed(email: string) {
		await baseExpect(this.page.getByText(email)).toBeVisible()
	}

	async clickResend() {
		await this.resendButton.click()
	}

	async expectResendDisabled() {
		await baseExpect(this.resendButton).toBeDisabled()
	}

	async expectResendCooldown() {
		await baseExpect(this.resendButton).toContainText(/resend in \d+s/i)
	}
}

export class EmailVerificationBanner {
	readonly page: Page
	readonly banner: Locator
	readonly resendButton: Locator
	readonly dismissButton: Locator

	constructor(page: Page) {
		this.page = page
		this.banner = page.locator("[role='alert']").filter({ hasText: /email.*not verified/i })
		this.resendButton = this.banner.getByRole("button", { name: /resend/i })
		this.dismissButton = this.banner.getByRole("button", { name: /dismiss/i })
	}

	async expectVisible() {
		await baseExpect(this.banner).toBeVisible()
	}

	async expectNotVisible() {
		await baseExpect(this.banner).not.toBeVisible()
	}

	async clickResend() {
		await this.resendButton.click()
	}

	async dismiss() {
		await this.dismissButton.click()
	}
}

export class SubmissionBlockPage {
	readonly page: Page
	readonly blockAlert: Locator
	readonly resendButton: Locator

	constructor(page: Page) {
		this.page = page
		this.blockAlert = page.locator("[role='alert']").filter({ hasText: /email verification required/i })
		this.resendButton = this.blockAlert.getByRole("button", { name: /resend/i })
	}

	async goto() {
		await this.page.goto("/submissions/new")
	}

	async expectBlocked() {
		await baseExpect(this.blockAlert).toBeVisible()
	}

	async expectFormVisible() {
		await baseExpect(this.page.getByLabel("Title")).toBeVisible()
	}

	async clickResend() {
		await this.resendButton.click()
	}
}

export class SettingsEmailSection {
	readonly page: Page
	readonly section: Locator
	readonly emailInput: Locator
	readonly verifiedBadge: Locator
	readonly notVerifiedBadge: Locator
	readonly resendButton: Locator

	constructor(page: Page) {
		this.page = page
		// Scope to the Contact & Invoice Information section
		this.section = page.locator("section").filter({
			has: page.getByRole("heading", { name: "Contact & Invoice Information" }),
		})
		this.emailInput = page.getByLabel("Email *")
		this.verifiedBadge = this.section.getByText("Email verified")
		this.notVerifiedBadge = this.section.getByText("Email not verified")
		this.resendButton = this.section.getByRole("button", { name: /resend/i })
	}

	async goto() {
		await this.page.goto("/profile")
		await this.page.getByRole("heading", { name: "Profile" }).waitFor({ state: "visible" })
	}

	async expectVerified() {
		await baseExpect(this.verifiedBadge).toBeVisible()
	}

	async expectNotVerified() {
		await baseExpect(this.notVerifiedBadge).toBeVisible()
	}

	async clickResend() {
		await this.resendButton.click()
	}
}

// Extended test with fixtures
interface EmailVerificationFixtures {
	verifyEmailPage: VerifyEmailPage
	emailBanner: EmailVerificationBanner
	submissionBlockPage: SubmissionBlockPage
	settingsEmailSection: SettingsEmailSection
}

export const test = base.extend<EmailVerificationFixtures>({
	page: async ({ page }, use) => {
		await dismissViteOverlay(page);
		await use(page);
	},

	verifyEmailPage: async ({ page }, use) => {
		await use(new VerifyEmailPage(page))
	},
	emailBanner: async ({ page }, use) => {
		await use(new EmailVerificationBanner(page))
	},
	submissionBlockPage: async ({ page }, use) => {
		await use(new SubmissionBlockPage(page))
	},
	settingsEmailSection: async ({ page }, use) => {
		await use(new SettingsEmailSection(page))
	},
})

export { expect } from "@playwright/test"
