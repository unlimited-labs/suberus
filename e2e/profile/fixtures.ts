import { type Locator, type Page } from "@playwright/test"
import { test as base, expect as baseExpect } from "../helpers/base-fixtures"
import { dismissViteOverlay } from "../helpers/page-setup"

export { TEST_USER } from "../helpers/test-users"

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
	readonly needInvoiceCheckbox: Locator
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
		this.heading = page.getByRole("heading", { name: "Profile" })

		// Personal info section
		const personalSection = page
			.locator("section")
			.filter({ has: page.getByRole("heading", { name: "Personal Information" }) })
		this.firstNameInput = page.getByLabel("First name *")
		this.lastNameInput = page.getByLabel("Last name *")
		// Title is a Radix Select trigger (no id assoc with label) — scope to section
		this.titleSelect = personalSection.getByRole("combobox")
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
		this.needInvoiceCheckbox = page.getByLabel("I need an invoice for my organization")
		this.addressInput = page.getByLabel("Billing details (organization)")
		// Country combobox within contact section
		this.countryButton = contactSection.getByRole("combobox")
		this.saveContactBtn = page
			.locator("section")
			.filter({ has: page.getByRole("heading", { name: "Contact & Invoice Information" }) })
			.getByRole("button", { name: "Save changes" })

		// Email verification status (in contact section)
		this.emailVerifiedBadge = contactSection.getByText("Email verified")
		this.emailNotVerifiedBadge = contactSection.getByText("Email not verified")
		this.emailResendButton = contactSection.getByRole("button", { name: /resend/i })

		// Password section - use id selectors to avoid ambiguity with similar labels
		this.currentPasswordInput = page.locator("#currentPassword")
		this.newPasswordInput = page.locator("#newPassword")
		this.confirmPasswordInput = page.locator("#confirmNewPassword")
		// Button text changes during submit, so match either state
		this.changePasswordBtn = page.getByRole("button", { name: /change password/i })
	}

	async goto() {
		await this.page.goto("/profile")
		await this.heading.waitFor({ state: "visible" })
	}

	async fillPersonalInfo(data: {
		firstName?: string
		lastName?: string
		title?: string
		affiliation?: string
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
		if (data.title !== undefined) {
			await this.titleSelect.click()
			await this.page.getByRole("option", { name: data.title, exact: true }).click()
		}
		if (data.affiliation !== undefined) {
			await this.affiliationInput.clear()
			await this.affiliationInput.fill(data.affiliation)
		}
		if (data.orcid !== undefined) {
			await this.orcidInput.clear()
			await this.orcidInput.fill(data.orcid)
		}
	}

	async savePersonalInfo() {
		await this.savePersonalBtn.click()
	}

	async fillContactInfo(data: { address?: string; country?: string }) {
		if (data.address !== undefined) {
			// Ensure invoice checkbox is checked so billing details field is visible
			if (!(await this.needInvoiceCheckbox.isChecked())) {
				await this.needInvoiceCheckbox.click()
			}
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
			timeout: 15000,
		})
	}

	async expectToastError(message: string | RegExp) {
		await baseExpect(this.page.locator("[data-sonner-toast]").getByText(message)).toBeVisible({
			timeout: 15000,
		})
	}
}

// Extended test with fixtures
interface SettingsFixtures {
	settingsPage: SettingsPage
}

export const test = base.extend<SettingsFixtures>({
	page: async ({ page }, use) => {
		await dismissViteOverlay(page);
		await use(page);
	},

	settingsPage: async ({ page }, use) => {
		await use(new SettingsPage(page))
	},
})

export { expect } from "@playwright/test"
