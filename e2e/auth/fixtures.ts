import type { Page } from "@playwright/test"

// Test data
export const TEST_USER = {
	email: "test@e2e.local",
	password: "TestPassword123!",
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
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/login")
	}

	async fillEmail(email: string) {
		await this.page.getByLabel("E-mail").fill(email)
	}

	async fillPassword(password: string) {
		await this.page.getByLabel("Password").fill(password)
	}

	async submit() {
		await this.page.getByRole("button", { name: "Sign in" }).click()
	}

	async login(email: string, password: string) {
		await this.fillEmail(email)
		await this.fillPassword(password)
		await this.submit()
	}

	get emailInput() {
		return this.page.getByLabel("E-mail")
	}

	get passwordInput() {
		return this.page.getByLabel("Password")
	}

	get submitButton() {
		return this.page.getByRole("button", { name: "Sign in" })
	}

	get heading() {
		return this.page.getByRole("heading", { name: "Sign in" })
	}

	get registerLink() {
		return this.page.getByRole("link", { name: "Create one" })
	}

	get forgotPasswordLink() {
		return this.page.getByRole("link", { name: "Forgot password?" })
	}
}

export class RegisterPage {
	constructor(private page: Page) {}

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
		const affiliationInput = this.page.getByPlaceholder("Type affiliation...")
		await affiliationInput.fill(data.affiliation)
		// Wait for debounced search to trigger (300ms debounce)
		await this.page.waitForTimeout(400)
		// Blur triggers selection from results or creation via API
		await affiliationInput.blur()
		// Wait for any async affiliation creation to complete
		await this.page.waitForTimeout(300)

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
		await this.page.getByRole("button", { name: "Continue" }).click()
	}

	async clickBack() {
		await this.page.getByRole("button", { name: "Back" }).click()
	}

	async clickCreateAccount() {
		await this.page.getByRole("button", { name: "Create account" }).click()
	}

	get heading() {
		return this.page.getByRole("heading", { name: "Registration" })
	}

	get loginLink() {
		return this.page.getByRole("link", { name: "Sign in" })
	}

	get continueButton() {
		return this.page.getByRole("button", { name: "Continue" })
	}

	get backButton() {
		return this.page.getByRole("button", { name: "Back" })
	}

	get createAccountButton() {
		return this.page.getByRole("button", { name: "Create account" })
	}
}

export class ForgotPasswordPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto("/forgot-password")
	}

	async fillEmail(email: string) {
		await this.page.getByLabel("E-mail").fill(email)
	}

	async submit() {
		await this.page.getByRole("button", { name: "Send reset link" }).click()
	}

	get heading() {
		return this.page.getByRole("heading", { name: "Forgot password?" })
	}

	get emailInput() {
		return this.page.getByLabel("E-mail")
	}

	get submitButton() {
		return this.page.getByRole("button", { name: "Send reset link" })
	}

	get backToLoginLink() {
		return this.page.getByRole("link", { name: "Back to login" })
	}

	get successHeading() {
		return this.page.getByRole("heading", { name: "Check your email" })
	}
}
