import { test as base, expect as baseExpect, type TestRunContext, type CleanupContext } from "../helpers/base-fixtures"
import { expect } from "@playwright/test"
import { type Page, type Locator } from "@playwright/test"
import { loginAs } from "../helpers/auth"

export { ADMIN_USER, TEST_USER, UNVERIFIED_USER, ADMIN_VERIFY_TEST_USER, EDITOR_USER } from "../helpers/test-users"

export async function loginAsAdmin(page: Page) {
	const { ADMIN_USER } = await import("../helpers/test-users")
	await loginAs(page, ADMIN_USER)
}

// Page Objects
export class AdminUsersPage {
	readonly page: Page
	readonly heading: Locator
	readonly exportButton: Locator
	readonly searchInput: Locator
	readonly table: Locator
	readonly loadingText: Locator

	constructor(page: Page) {
		this.page = page
		this.heading = page.getByRole("heading", { name: "Users" })
		this.exportButton = page.getByRole("link", { name: "Export XLSX" })
		this.searchInput = page.getByPlaceholder("Search users...")
		this.table = page.getByRole("table")
		this.loadingText = page.getByText("Loading...")
	}

	async goto() {
		await this.page.goto("/admin/users")
	}

	async waitForLoad() {
		// Wait for heading (works on both desktop table and mobile cards)
		await expect(this.heading).toBeVisible({ timeout: 10000 })
		// Wait for table data to actually load (pagination shows non-zero page count)
		await expect(this.page.getByText(/Page \d+ of [1-9]/)).toBeVisible({ timeout: 15000 })
	}

	async search(query: string) {
		// Clear previous search first
		await this.searchInput.clear()
		await this.searchInput.fill(query)
	}

	async selectUser(user: { email: string; firstName: string; lastName: string }) {
		// Find the row by email — the email is unique, no need to search first
		const row = this.page.getByTestId("user-row").filter({ visible: true, has: this.page.locator(`text="${user.email}"`) })
		await expect(row).toBeVisible({ timeout: 10000 })
		const checkbox = row.getByRole("checkbox")
		await checkbox.check()
		await expect(checkbox).toBeChecked()
	}

	async selectAllUsers() {
		await this.page.locator("thead").getByRole("checkbox").click()
	}

	async openBulkActions() {
		return this.page.getByRole("combobox").filter({ hasText: "Bulk actions" })
	}

	async selectBulkAction(action: string) {
		await this.page.getByRole("combobox").first().click()
		await this.page.getByRole("option", { name: action }).click()
	}

	async clickApply() {
		await this.page.getByRole("button", { name: "Apply" }).click()
	}

	async openUserDetail(user: { email: string; firstName: string; lastName: string }) {
		// Search by full name for precise match (firstName "Test" alone matches too many e2e users)
		await this.search(`${user.firstName} ${user.lastName}`)
		// Find the row by the exact email text
		const row = this.page.getByTestId("user-row").filter({ visible: true, has: this.page.locator(`text="${user.email}"`) })
		await expect(row).toBeVisible({ timeout: 10000 })
		await row.getByRole("button", { name: "Actions menu" }).click()
		await this.page.getByRole("menuitem", { name: "View" }).click()
	}

	async getRowByEmail(user: { email: string; firstName: string; lastName: string }) {
		// Search by full name for precise match
		await this.search(`${user.firstName} ${user.lastName}`)
		// Find the row by the exact email text
		return this.page.getByTestId("user-row").filter({ visible: true, has: this.page.locator(`text="${user.email}"`) })
	}

	getSelectedCount() {
		return this.page.getByText(/\d+ selected/)
	}
}

export class UserDetailPage {
	readonly page: Page
	readonly backButton: Locator
	readonly changeRoleButton: Locator
	readonly deactivateButton: Locator
	readonly activateButton: Locator
	readonly markAsPaidButton: Locator
	readonly feeStatusPaid: Locator
	readonly feeStatusUnpaid: Locator
	readonly emailVerified: Locator
	readonly emailNotVerified: Locator
	readonly verifyEmailButton: Locator
	readonly unmarkButton: Locator
	readonly editProfileButton: Locator
	readonly deleteUserButton: Locator

	constructor(page: Page) {
		this.page = page
		this.backButton = page.getByRole("link", { name: "Back" })
		this.changeRoleButton = page.getByRole("button", { name: "Change Role" })
		this.deactivateButton = page.getByRole("button", { name: "Deactivate" })
		this.activateButton = page.getByRole("button", { name: "Activate" })
		this.markAsPaidButton = page.getByRole("button", { name: "Mark as Paid" })
		this.feeStatusPaid = page.getByText("Fee Paid")
		this.feeStatusUnpaid = page.getByText("Fee Unpaid")
		this.emailVerified = page.getByText("Email verified")
		this.emailNotVerified = page.getByText("Email not verified")
		this.verifyEmailButton = page.getByRole("button", { name: "Verify" })
		this.unmarkButton = page.getByRole("button", { name: "Unmark" })
		this.editProfileButton = page.getByRole("button", { name: "Edit Profile" })
		this.deleteUserButton = page.getByRole("button", { name: "Delete User" })
	}

	async goto(userId: string) {
		await this.page.goto(`/admin/users/${userId}`)
	}

	async selectRole(role: string) {
		await this.page.getByRole("combobox").click()
		await this.page.getByRole("option", { name: role }).click()
	}

	async selectFeeType(feeType: string) {
		await this.page.getByRole("combobox").click()
		await this.page.getByRole("option", { name: feeType }).click()
	}

	async confirmDialog() {
		await this.page.getByRole("button", { name: "Save" }).click()
	}

	async cancelDialog() {
		await this.page.getByRole("button", { name: "Cancel" }).click()
	}

	getUserEmail() {
		return this.page.getByRole("link").filter({ hasText: /@/ })
	}

	getRoleBadge() {
		return this.page.locator("[data-slot='badge']").first()
	}
}

export class BulkActionDialog {
	readonly page: Page
	readonly confirmButton: Locator
	readonly cancelButton: Locator

	constructor(page: Page) {
		this.page = page
		this.confirmButton = page.getByRole("button", { name: "Confirm" })
		this.cancelButton = page.getByRole("button", { name: "Cancel" })
	}

	async selectFeeType(feeType: string) {
		await this.page.getByRole("combobox").click()
		await this.page.getByRole("option", { name: feeType }).click()
	}

	async selectRole(role: string) {
		await this.page.getByRole("combobox").click()
		await this.page.getByRole("option", { name: role }).click()
	}
}

export class AdminSettingsPage {
	readonly page: Page
	readonly conferenceTab: Locator
	readonly submissionsTab: Locator
	readonly typesTab: Locator
	readonly saveAllButton: Locator

	constructor(page: Page) {
		this.page = page
		this.conferenceTab = page.getByRole("tab", { name: /Conference/i })
		this.submissionsTab = page.getByRole("tab", { name: /Submissions$/i })
		this.typesTab = page.getByRole("tab", { name: /Submission Types/i })
		this.saveAllButton = page.getByRole("button", { name: "Save All Settings" })
	}

	async goto() {
		await this.page.goto("/admin/settings")
	}

	/** Get tab by name (uses role-based selector) */
	getTab(name: string): Locator {
		return this.page.getByRole("tab", { name: new RegExp(name, "i") })
	}

	async switchToSubmissionsTab(testInfo?: { project: { name: string } }) {
		if (testInfo?.project.name === "mobile-admin") {
			// Mobile uses nth() because tab names may be truncated
			const tabs = this.page.getByRole("tab")
			await tabs.nth(1).click()
		} else {
			await this.submissionsTab.click()
		}
		await expect(this.page.getByRole("heading", { name: "Content Validation" })).toBeVisible()
	}

	async switchToTypesTab(testInfo?: { project: { name: string } }) {
		if (testInfo?.project.name === "mobile-admin") {
			// Mobile uses nth() because tab names may be truncated
			const tabs = this.page.getByRole("tab")
			await tabs.nth(2).click()
		} else {
			await this.typesTab.click()
		}
		await expect(this.page.getByText("Oral Presentation")).toBeVisible()
	}

	async expandSubmissionType(name: string) {
		await this.page.getByRole("button", { name: new RegExp(name, "i") }).first().click()
		await expect(this.page.getByText("Content Format")).toBeVisible()
	}

	async toggleActiveSwitch() {
		const activeSwitch = this.page.getByRole("switch").first()
		await activeSwitch.click()
		return activeSwitch
	}

	async saveSubmissionType() {
		await this.page.getByRole("button", { name: "Save" }).click()
	}

	async saveValidationSettings() {
		await this.saveAllButton.click()
		await expect(this.page.getByText("Submission settings saved")).toBeVisible({ timeout: 5000 })
	}

	getMinLengthInput(index = 0) {
		return this.page.getByLabel("Min length (characters)").nth(index)
	}

	getMaxLengthInput(index = 0) {
		return this.page.getByLabel("Max length (characters)").nth(index)
	}

	getMinKeywordsInput() {
		return this.page.getByLabel("Min keywords")
	}

	getMaxKeywordsInput() {
		return this.page.getByLabel("Max keywords")
	}

	getEnableKeywordsSwitch() {
		return this.page.getByLabel("Enable keywords")
	}

	getMaxFileSizeInput() {
		return this.page.getByLabel("Max file size (MB)")
	}

	getRequiredReviewersInput() {
		const container = this.page.locator("div").filter({ hasText: /^Required reviewers$/ })
		return container.getByRole("spinbutton")
	}

	getContentFormatSelect() {
		return this.page.getByRole("combobox").first()
	}

	async selectContentFormat(format: "Text (Abstract)" | "File Upload") {
		await this.getContentFormatSelect().click()
		await this.page.getByRole("option", { name: format }).click()
	}

	getFileExtensionCheckbox(ext: "pdf" | "doc" | "docx") {
		return this.page.getByLabel(ext, { exact: ext === "doc" })
	}

	async switchToConferenceTab(testInfo?: { project: { name: string } }) {
		if (testInfo?.project.name === "mobile-admin") {
			await this.page.getByRole("tab").nth(0).click()
		} else {
			await this.conferenceTab.click()
		}
		await expect(this.page.getByRole("heading", { name: "Basic Information" })).toBeVisible()
	}

	getConferenceNameInput() {
		return this.page.getByLabel("Conference Name")
	}

	getTimezoneCombobox() {
		return this.page.getByRole("combobox", { name: /timezone/i })
	}

	async saveConferenceSettings() {
		await this.page.getByRole("button", { name: "Save" }).first().click()
	}

	// --- Survey tab ---

	async switchToSurveyTab(testInfo?: { project: { name: string } }) {
		if (testInfo?.project.name === "mobile-admin") {
			await this.page.getByRole("tab").nth(9).click()
		} else {
			await this.page.getByRole("tab", { name: /Survey/i }).click()
		}
		await expect(this.page.getByRole("heading", { name: "Survey Questions" })).toBeVisible()
	}

	// --- Terms of Service tab ---

	async switchToTosTab(testInfo?: { project: { name: string } }) {
		if (testInfo?.project.name === "mobile-admin") {
			await this.page.getByRole("tab").nth(10).click()
		} else {
			await this.page.getByRole("tab", { name: /Terms of Service/i }).click()
		}
		await expect(this.page.getByRole("heading", { name: "Terms of Service" })).toBeVisible()
	}

	// --- Branding tab ---

	async switchToBrandingTab(testInfo?: { project: { name: string } }) {
		if (testInfo?.project.name === "mobile-admin") {
			await this.page.getByRole("tab").nth(6).click()
		} else {
			await this.page.getByRole("tab", { name: /Branding/i }).click()
		}
		await expect(this.page.getByRole("heading", { name: "Logo & Graphics" })).toBeVisible()
	}

	// --- Fee tab ---

	async switchToFeeTab(testInfo?: { project: { name: string } }) {
		if (testInfo?.project.name === "mobile-admin") {
			await this.page.getByRole("tab").nth(7).click()
		} else {
			await this.page.getByRole("tab", { name: /^Fee$/i }).click()
		}
		await expect(this.page.getByRole("heading", { name: "Fee Types" })).toBeVisible()
	}

	// --- Display Format (Conference tab) ---

	getDateFormatSelect() {
		return this.page.locator("#dateFormat")
	}

	getTimeFormatRadio(value: "24h" | "12h") {
		return this.page.locator(`#time-${value}`)
	}

	// --- Confidence Level (Submission Types tab) ---

	getEnableConfidenceLevelSwitch() {
		return this.page.getByLabel("Enable confidence level")
	}

	getLogoUrlInput() {
		return this.page.getByLabel("Logo URL")
	}

	getFaviconUrlInput() {
		return this.page.getByLabel("Favicon URL")
	}

	getPrimaryColorInput() {
		return this.page.getByLabel("Primary color").last()
	}

	getSecondaryColorInput() {
		return this.page.getByLabel("Secondary color").last()
	}

	getFooterTextInput() {
		return this.page.getByLabel("Footer text")
	}

	async saveBrandingSection(sectionName: "Logo & Graphics" | "Theme Colors" | "Footer") {
		const section = this.page.locator("section, div").filter({ hasText: sectionName })
		await section.getByRole("button", { name: "Save" }).last().click()
	}

	// --- Auth Background Image ---

	getAuthBackgroundUploadButton() {
		return this.page.getByTestId("auth-background-upload")
	}

	getAuthBackgroundRemoveButton() {
		return this.page.getByTestId("auth-background-remove")
	}

	getAuthBackgroundPreview() {
		return this.page.getByTestId("auth-background-preview")
	}

	getAuthBackgroundFileInput() {
		return this.page.locator("input[aria-label='Upload auth background']")
	}

	async loginAsAdmin(testRunId: string) {
		const { DEFAULT_PASSWORD } = await import("../helpers/test-users")
		await loginAs(this.page, { email: `admin-${testRunId}@e2e.local`, password: DEFAULT_PASSWORD })
	}
}

// Extended test with fixtures
interface AdminFixtures {
	testRun: TestRunContext
	cleanup: CleanupContext
	adminUsersPage: AdminUsersPage
	userDetailPage: UserDetailPage
	bulkActionDialog: BulkActionDialog
	adminSettingsPage: AdminSettingsPage
}

export const test = base.extend<AdminFixtures>({
	adminUsersPage: async ({ page }, use) => {
		await use(new AdminUsersPage(page))
	},
	userDetailPage: async ({ page }, use) => {
		await use(new UserDetailPage(page))
	},
	bulkActionDialog: async ({ page }, use) => {
		await use(new BulkActionDialog(page))
	},
	adminSettingsPage: async ({ page }, use) => {
		await use(new AdminSettingsPage(page))
	},
})

export { baseExpect as expect }
