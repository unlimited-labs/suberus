import { type Page, type Locator } from "@playwright/test"
import { test as base, expect, type TestRunContext } from "../helpers/base-fixtures"

export { TEST_USER } from "../helpers/test-users"
export { clearMailpit, clearMailpitForAddress, getMailpitMessages, getMailpitMessage, waitForEmail } from "../helpers/mailpit"

export const INVALID_USER = {
	email: "invalid@example.com",
	password: "wrongpassword",
}

// Page Objects
export class LoginPage {
	readonly page: Page
	readonly emailInput: Locator
	readonly passwordInput: Locator
	readonly submitButton: Locator
	readonly heading: Locator
	readonly registerLink: Locator
	readonly forgotPasswordLink: Locator

	constructor(page: Page) {
		this.page = page
		this.emailInput = page.getByLabel("E-mail")
		this.passwordInput = page.getByLabel("Password", { exact: true })
		this.submitButton = page.getByRole("button", { name: "Sign in", exact: true })
		this.heading = page.getByRole("heading", { name: "Sign in" })
		this.registerLink = page.getByRole("link", { name: "Create one" })
		this.forgotPasswordLink = page.getByRole("link", { name: "Forgot password?" })
	}

	async goto() {
		await this.page.goto("/login")
	}

	async fillEmail(email: string) {
		await this.emailInput.fill(email)
	}

	async fillPassword(password: string) {
		await this.passwordInput.fill(password)
	}

	async submit() {
		// Ensure button is visible and enabled before clicking
		await expect(this.submitButton).toBeVisible()
		await expect(this.submitButton).toBeEnabled()
		await this.submitButton.scrollIntoViewIfNeeded()
		await this.submitButton.click()
	}

	async login(email: string, password: string) {
		await this.fillEmail(email)
		await this.fillPassword(password)
		// Use Enter key which is more reliable than button click
		await this.passwordInput.press("Enter")
	}
}

export class RegisterPage {
	readonly page: Page
	readonly heading: Locator
	readonly loginLink: Locator
	readonly continueButton: Locator
	readonly backButton: Locator
	readonly createAccountButton: Locator
	readonly affiliationInput: Locator

	constructor(page: Page) {
		this.page = page
		this.heading = page.getByRole("heading", { name: "Registration" })
		this.loginLink = page.getByRole("link", { name: "Sign in" })
		this.continueButton = page.getByRole("button", { name: "Continue" })
		this.backButton = page.getByRole("button", { name: "Back" })
		this.createAccountButton = page.getByRole("button", { name: "Create account" })
		this.affiliationInput = page.getByLabel("Affiliation")
	}

	async goto() {
		await this.page.goto("/register")
	}

	// Step 1: Author Information
	async fillStep1(data: {
		email: string
		password: string
		confirmPassword: string
		firstName: string
		lastName: string
		affiliation: string
		title?: string
	}) {
		await this.page.getByLabel("E-mail *").fill(data.email)
		await this.page.getByLabel("Password *", { exact: true }).fill(data.password)
		await this.page.getByLabel("Confirm Password *").fill(data.confirmPassword)
		await this.page.getByLabel("First name *").fill(data.firstName)
		await this.page.getByLabel("Last name *").fill(data.lastName)

		// AffiliationSelect is an inline autocomplete input — retry fill+click due to dropdown re-render
		const option = this.page.getByRole("option").filter({ hasText: data.affiliation }).first()
		await expect(async () => {
			await this.affiliationInput.fill(data.affiliation)
			await expect(option).toBeVisible()
			await option.click()
			await expect(this.affiliationInput).toHaveValue(data.affiliation)
		}).toPass({ timeout: 15000 })

		if (data.title) {
			await this.page.getByLabel("Title").click()
			await this.page.getByRole("option", { name: data.title }).click()
		}
	}

	// Step 2: Invoice Information
	async fillStep2(data: { country: string; address?: string }) {
		// Wait for step 2 to be visible, retrying the Continue click if needed
		await this.waitForStep2()
		// Scope combobox to the Country field to avoid strict mode violations during step transitions
		const countryField = this.page.locator('[data-slot="field"]').filter({ has: this.page.getByText("Country *", { exact: true }) })
		const combobox = countryField.getByRole("combobox")

		if (data.address) {
			await this.page.getByLabel("Billing details (organization)").fill(data.address)
		}

		const searchInput = this.page.getByPlaceholder("Search country...")
		await combobox.click()
		// Retry click if dropdown doesn't open (can happen under load)
		try {
			await searchInput.waitFor({ state: "visible", timeout: 5000 })
		} catch {
			await combobox.click()
			await searchInput.waitFor({ state: "visible", timeout: 10000 })
		}
		await searchInput.fill(data.country)
		await this.page.getByRole("option", { name: data.country }).click()
	}

	/** Wait for step 2 to be visible after navigating from step 1 */
	async waitForStep2() {
		const countryLabel = this.page.getByText("Country *")
		try {
			await countryLabel.waitFor({ state: "visible", timeout: 5000 })
		} catch {
			await this.clickContinue()
			await countryLabel.waitFor({ state: "visible", timeout: 10000 })
		}
	}

	// Step 3: Survey
	async fillStep3(data: { acceptTerms: boolean; checkSurveyQuestions?: string[] }) {
		// Wait for step 3 to be visible; retry Continue click if async validation race
		const termsCheckbox = this.page.getByRole("checkbox", { name: /I agree to the/ })
		try {
			await termsCheckbox.waitFor({ state: "visible", timeout: 5000 })
		} catch {
			await this.continueButton.click()
			await termsCheckbox.waitFor({ state: "visible", timeout: 10000 })
		}

		if (data.checkSurveyQuestions) {
			for (const label of data.checkSurveyQuestions) {
				await this.page.getByLabel(label).check()
			}
		}

		// Answer the seeded required "Preferred session format" question so the
		// step gates open (survey isRequired is enforced). No-op if not present.
		const formatTrigger = this.page
			.getByTestId("survey-question-field")
			.filter({ hasText: /^Preferred session format/ })
			.getByRole("combobox")
		if (await formatTrigger.isVisible().catch(() => false)) {
			await formatTrigger.click()
			await this.page.getByRole("option", { name: "Oral" }).click()
		}

		if (data.acceptTerms) {
			await this.page.getByRole("checkbox", { name: /I agree to the/ }).check()
		}
	}

	async clickContinue() {
		// Dismiss any open dropdown (e.g. Title select) that may block the button
		await this.page.keyboard.press("Escape")
		await expect(this.continueButton).toBeVisible()
		await expect(this.continueButton).toBeEnabled()
		await this.continueButton.scrollIntoViewIfNeeded()
		await this.continueButton.click()
	}

	async clickBack() {
		await this.backButton.click()
		// Wait for step 1 form to be visible after navigation
		await this.page.getByLabel("E-mail *").waitFor({ state: "visible", timeout: 10000 })
	}

	async clickCreateAccount() {
		await this.createAccountButton.click()
	}
}

export class VerifyEmailPage {
	readonly page: Page
	readonly heading: Locator
	readonly resendButton: Locator
	readonly backToLoginLink: Locator

	constructor(page: Page) {
		this.page = page
		this.heading = page.getByRole("heading", { name: "Check your email" })
		this.resendButton = page.getByRole("button", { name: /resend/i })
		this.backToLoginLink = page.getByRole("link", { name: "Back to login" })
	}

	async goto(email?: string) {
		const url = email ? `/verify-email?email=${encodeURIComponent(email)}` : "/verify-email"
		await this.page.goto(url)
	}

	async expectEmailDisplayed(email: string) {
		await expect(this.page.getByText(email)).toBeVisible()
	}
}

export class ForgotPasswordPage {
	readonly page: Page
	readonly heading: Locator
	readonly emailInput: Locator
	readonly submitButton: Locator
	readonly backToLoginLink: Locator
	readonly successHeading: Locator

	constructor(page: Page) {
		this.page = page
		this.heading = page.getByRole("heading", { name: "Forgot password?" })
		this.emailInput = page.getByLabel("E-mail")
		this.submitButton = page.getByRole("button", { name: "Send reset link" })
		this.backToLoginLink = page.getByRole("link", { name: "Back to login" })
		this.successHeading = page.getByRole("heading", { name: "Check your email" })
	}

	async goto() {
		await this.page.goto("/forgot-password")
	}

	async fillEmail(email: string) {
		await this.emailInput.fill(email)
	}

	async submit() {
		await this.submitButton.click()
	}
}

export class ResetPasswordPage {
	readonly page: Page
	readonly newPasswordInput: Locator
	readonly confirmPasswordInput: Locator
	readonly submitButton: Locator
	readonly successHeading: Locator
	readonly errorHeading: Locator
	readonly requestNewLinkButton: Locator
	readonly backToLoginLink: Locator

	constructor(page: Page) {
		this.page = page
		this.newPasswordInput = page.getByLabel("New Password")
		this.confirmPasswordInput = page.getByLabel("Confirm Password")
		this.submitButton = page.getByRole("button", { name: "Reset password" })
		this.successHeading = page.getByRole("heading", { name: "Password reset successful" })
		this.errorHeading = page.getByRole("heading", { name: /Invalid reset link|Link expired/ })
		this.requestNewLinkButton = page.getByRole("link", { name: "Request new link" })
		this.backToLoginLink = page.getByRole("link", { name: "Back to login" })
	}

	async goto(token?: string) {
		const url = token ? `/reset-password?token=${encodeURIComponent(token)}` : "/reset-password"
		await this.page.goto(url)
	}

	async fillPasswords(newPassword: string, confirmPassword: string) {
		await this.newPasswordInput.fill(newPassword)
		await this.confirmPasswordInput.fill(confirmPassword)
	}

	async submit() {
		await this.submitButton.click()
	}
}

// Extended test with fixtures
interface AuthFixtures {
	testRun: TestRunContext
	loginPage: LoginPage
	registerPage: RegisterPage
	forgotPasswordPage: ForgotPasswordPage
	verifyEmailPage: VerifyEmailPage
	resetPasswordPage: ResetPasswordPage
}

export const test = base.extend<AuthFixtures>({
	loginPage: async ({ page }, use) => {
		await use(new LoginPage(page))
	},
	registerPage: async ({ page }, use) => {
		await use(new RegisterPage(page))
	},
	forgotPasswordPage: async ({ page }, use) => {
		await use(new ForgotPasswordPage(page))
	},
	verifyEmailPage: async ({ page }, use) => {
		await use(new VerifyEmailPage(page))
	},
	resetPasswordPage: async ({ page }, use) => {
		await use(new ResetPasswordPage(page))
	},
})

export { expect }
