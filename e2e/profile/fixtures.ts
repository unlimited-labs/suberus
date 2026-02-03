import { test as base, expect as baseExpect, type Locator, type Page } from "@playwright/test"

// Test data
export const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
	firstName: "Test",
	lastName: "User",
}

export const VALID_ORCID = "0000-0002-1825-0097"

// Page Object
export class SettingsPage {
	readonly page: Page
	readonly heading: Locator
	// Personal info
	readonly firstNameInput: Locator
	readonly lastNameInput: Locator
	readonly titleSelect: Locator
	readonly affiliationInput: Locator
	readonly orcidInput: Locator
	readonly savePersonalBtn: Locator
	// Contact info
	readonly emailInput: Locator
	readonly addressInput: Locator
	readonly countryButton: Locator
	readonly saveContactBtn: Locator
	// Email verification status
	readonly emailVerifiedBadge: Locator
	readonly emailNotVerifiedBadge: Locator
	readonly emailResendButton: Locator
	// Password
	readonly currentPasswordInput: Locator
	readonly newPasswordInput: Locator
	readonly confirmPasswordInput: Locator
	readonly changePasswordBtn: Locator

	constructor(page: Page) {
		this.page = page
		this.heading = page.getByRole("heading", { name: "Settings" })

		// Personal info section
		this.firstNameInput = page.getByLabel("First name *")
		this.lastNameInput = page.getByLabel("Last name *")
		this.titleSelect = page.getByLabel("Title")
		this.affiliationInput = page.getByLabel("Affiliation")
		this.orcidInput = page.getByLabel("ORCID")
		// Use section element with heading to find the correct Save button
		this.savePersonalBtn = page
			.locator("section")
			.filter({ has: page.getByRole("heading", { name: "Personal Information" }) })
			.getByRole("button", { name: "Save changes" })

		// Contact info section - scope within the section with "Contact & Invoice" heading
		const contactSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Contact & Invoice Information" }) })
		this.emailInput = page.getByLabel("Email *")
		this.addressInput = page.getByLabel("Invoice address")
		// Country combobox within contact section
		this.countryButton = contactSection.getByRole("combobox")
		this.saveContactBtn = page
			.locator("section")
			.filter({ has: page.getByRole("heading", { name: "Contact & Invoice Information" }) })
			.getByRole("button", { name: "Save changes" })

		// Email verification status (in contact section)
		this.emailVerifiedBadge = contactSection.getByText("Email verified")
		this.emailNotVerifiedBadge = contactSection.getByText("Email not verified")
		this.emailResendButton = contactSection.locator("button", { hasText: /resend/i })

		// Password section - use id selectors to avoid ambiguity with similar labels
		this.currentPasswordInput = page.locator("#currentPassword")
		this.newPasswordInput = page.locator("#newPassword")
		this.confirmPasswordInput = page.locator("#confirmNewPassword")
		// Button text changes during submit, so match either state
		this.changePasswordBtn = page.getByRole("button", { name: /change password/i })
	}

	async goto() {
		await this.page.goto("/settings")
		await this.heading.waitFor({ state: "visible" })
	}

	async fillPersonalInfo(data: {
		firstName?: string
		lastName?: string
		orcid?: string
	}) {
		if (data.firstName !== undefined) {
			await this.firstNameInput.clear()
			await this.firstNameInput.fill(data.firstName)
		}
		if (data.lastName !== undefined) {
			await this.lastNameInput.clear()
			await this.lastNameInput.fill(data.lastName)
		}
		if (data.orcid !== undefined) {
			await this.orcidInput.clear()
			await this.orcidInput.fill(data.orcid)
		}
	}

	async savePersonalInfo() {
		await this.savePersonalBtn.click()
		await this.page.waitForLoadState("networkidle")
	}

	async fillContactInfo(data: { address?: string; country?: string }) {
		if (data.address !== undefined) {
			await this.addressInput.clear()
			await this.addressInput.fill(data.address)
		}
		if (data.country !== undefined) {
			await this.countryButton.click()
			await this.page.getByPlaceholder("Search country...").fill(data.country)
			await this.page.getByRole("option", { name: data.country }).click()
		}
	}

	async saveContactInfo() {
		await this.saveContactBtn.click()
		await this.page.waitForLoadState("networkidle")
	}

	async fillPasswordChange(data: {
		currentPassword: string
		newPassword: string
		confirmPassword: string
	}) {
		await this.currentPasswordInput.fill(data.currentPassword)
		await this.newPasswordInput.fill(data.newPassword)
		await this.confirmPasswordInput.fill(data.confirmPassword)
	}

	async submitPasswordChange() {
		await this.changePasswordBtn.click()
	}

	async expectToastSuccess(message: string | RegExp) {
		await baseExpect(this.page.locator("[data-sonner-toast]").getByText(message)).toBeVisible({
			timeout: 5000,
		})
	}

	async expectToastError(message: string | RegExp) {
		await baseExpect(this.page.locator("[data-sonner-toast]").getByText(message)).toBeVisible({
			timeout: 5000,
		})
	}
}

// Extended test with fixtures
interface SettingsFixtures {
	settingsPage: SettingsPage
}

export const test = base.extend<SettingsFixtures>({
	settingsPage: async ({ page }, use) => {
		await use(new SettingsPage(page))
	},
})

export { expect } from "@playwright/test"
