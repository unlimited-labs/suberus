import { test as base, type Page, type Locator, expect } from "@playwright/test"

// Test data
export const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
	firstName: "Test",
	lastName: "User",
	affiliation: "Test University",
}

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
		this.passwordInput = page.getByLabel("Password")
		this.submitButton = page.getByRole("button", { name: "Sign in" })
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
		await this.submitButton.click()
	}

	async login(email: string, password: string) {
		await this.fillEmail(email)
		await this.fillPassword(password)
		await this.submit()
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
		this.affiliationInput = page.getByPlaceholder("Type affiliation...")
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

		// AffiliationSelect is an autocomplete - fill and blur to create/select
		await this.affiliationInput.fill(data.affiliation)
		// Blur triggers selection from results or creation via API
		await this.affiliationInput.blur()
		// Wait for network to settle (API call completes)
		await this.page.waitForLoadState("networkidle")
		await expect(this.affiliationInput).toHaveValue(data.affiliation, { timeout: 5000 })

		if (data.title) {
			await this.page.getByLabel("Title").click()
			await this.page.getByRole("option", { name: data.title }).click()
		}
	}

	// Step 2: Invoice Information
	async fillStep2(data: { country: string; address?: string }) {
		if (data.address) {
			await this.page.getByLabel("Address").fill(data.address)
		}

		await this.page.getByRole("combobox").click()
		await this.page.getByPlaceholder("Search country...").fill(data.country)
		await this.page.getByRole("option", { name: data.country }).click()
	}

	// Step 3: Survey
	async fillStep3(data: { acceptTerms: boolean; needsVisaLetter?: boolean; needsCertificate?: boolean }) {
		if (data.needsVisaLetter) {
			await this.page
				.getByLabel("Please send me an Invitation Letter for a Visa Application.")
				.check()
		}
		if (data.needsCertificate) {
			await this.page.getByLabel("I need a certificate of attendance.").check()
		}
		if (data.acceptTerms) {
			await this.page.getByLabel(/I agree to the/).check()
		}
	}

	async clickContinue() {
		await this.continueButton.click()
	}

	async clickBack() {
		await this.backButton.click()
	}

	async clickCreateAccount() {
		await this.createAccountButton.click()
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

// Extended test with fixtures
interface AuthFixtures {
	loginPage: LoginPage
	registerPage: RegisterPage
	forgotPasswordPage: ForgotPasswordPage
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
})

export { expect } from "@playwright/test"
