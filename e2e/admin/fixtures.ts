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

/** Admin Submissions list — bulk-action helpers (desktop table layout). */
export class AdminSubmissionsPage {
	readonly page: Page
	readonly searchInput: Locator

	constructor(page: Page) {
		this.page = page
		this.searchInput = page.getByPlaceholder("Search submissions...")
	}

	async goto() {
		await this.page.goto("/admin/submissions")
	}

	/** Navigate, filter by the test-run id, and wait until the given submission cell appears. */
	async gotoAndSearch(testRunId: string, expectTitle: string) {
		await this.goto()
		await this.searchInput.fill(testRunId)
		await expect(this.page.getByRole("cell", { name: `${testRunId}_${expectTitle}` })).toBeVisible()
	}

	/** Tick the row checkbox for a submission identified by its full (prefixed) title. */
	async selectRow(fullTitle: string) {
		await this.page.locator("tr").filter({ hasText: fullTitle }).getByRole("checkbox").check()
	}

	/** Open a bulk action from the toolbar and return the opened dialog. */
	async openBulkAction(optionName: string | RegExp): Promise<Locator> {
		await this.page.getByRole("combobox").filter({ hasText: /Bulk actions/ }).click()
		await this.page.getByRole("option", { name: optionName }).click()
		await this.page.getByRole("button", { name: "Apply" }).click()
		const dialog = this.page.getByRole("dialog")
		await expect(dialog).toBeVisible()
		return dialog
	}
}

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
		// Wait for the table component to mount (pager renders a non-zero page count).
		// toBeAttached, not toBeVisible: the pager is hidden on mobile (cards instead),
		// but still in the DOM once data has loaded.
		await expect(this.page.getByText(/Page \d+ of [1-9]/)).toBeAttached({ timeout: 15000 })
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
		// Wait for the list to unmount; its rows share the "Actions menu" name.
		await expect(this.page.getByTestId("user-row")).toHaveCount(0)
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
	readonly actionsMenuButton: Locator
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
	readonly submissionRows: Locator

	constructor(page: Page) {
		this.page = page
		this.backButton = page.getByRole("link", { name: "Back" })
		// Header actions now live behind the "Actions menu" dropdown — open it
		// with openActions() before clicking/asserting any of these menu items.
		this.actionsMenuButton = page.getByRole("button", { name: "Actions menu" })
		this.changeRoleButton = page.getByRole("menuitem", { name: "Change Role" })
		this.deactivateButton = page.getByRole("menuitem", { name: "Deactivate" })
		this.activateButton = page.getByRole("menuitem", { name: "Activate" })
		this.markAsPaidButton = page.getByRole("button", { name: "Mark as Paid" })
		this.feeStatusPaid = page.getByText("Fee Paid")
		this.feeStatusUnpaid = page.getByText("Fee Unpaid")
		this.emailVerified = page.getByText("Email verified")
		this.emailNotVerified = page.getByText("Email not verified")
		this.verifyEmailButton = page.getByRole("button", { name: "Verify" })
		this.unmarkButton = page.getByRole("button", { name: "Unmark" })
		this.editProfileButton = page.getByRole("menuitem", { name: "Edit Profile" })
		this.deleteUserButton = page.getByRole("menuitem", { name: "Delete User" })
		this.submissionRows = page.getByTestId("user-submission-row")
	}

	async goto(userId: string) {
		await this.page.goto(`/admin/users/${userId}`)
	}

	/** Open the header "Actions menu" dropdown that holds edit/role/activate/late/delete. */
	async openActions() {
		await this.actionsMenuButton.click()
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
	readonly saveAllButton: Locator

	constructor(page: Page) {
		this.page = page
		this.saveAllButton = page.getByRole("button", { name: "Save All Settings" })
	}

	async goto() {
		await this.page.goto("/admin/settings")
	}

	/** Get tab by name (uses role-based selector) */
	getTab(name: string): Locator {
		return this.page.getByRole("tab", { name: new RegExp(name, "i") })
	}

	async switchToSubmissionsTab(_testInfo?: { project: { name: string } }) {
		await this.page.getByTestId("settings-tab-submissions").click()
		await expect(this.page.getByRole("heading", { name: "Content Validation" })).toBeVisible()
	}

	async switchToTypesTab(_testInfo?: { project: { name: string } }) {
		await this.page.getByTestId("settings-tab-types").click()
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

	getFileExtensionRadio(ext: "pdf" | "docx") {
		return this.page.getByRole("radio", { name: ext })
	}

	async switchToConferenceTab(_testInfo?: { project: { name: string } }) {
		await this.page.getByTestId("settings-tab-conference").click()
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

	async switchToSurveyTab(_testInfo?: { project: { name: string } }) {
		await this.page.getByTestId("settings-tab-survey").click()
		await expect(this.page.getByRole("heading", { name: "Survey Questions" })).toBeVisible()
	}

	// --- Terms of Service tab ---

	async switchToTosTab(_testInfo?: { project: { name: string } }) {
		await this.page.getByTestId("settings-tab-tos").click()
		await expect(this.page.getByRole("heading", { name: "Terms of Service" })).toBeVisible()
	}

	// --- Branding tab ---

	async switchToBrandingTab(_testInfo?: { project: { name: string } }) {
		await this.page.getByTestId("settings-tab-branding").click()
		await expect(this.page.getByRole("heading", { name: "Logo & Graphics" })).toBeVisible()
	}

	// --- Fee tab ---

	async switchToFeeTab(_testInfo?: { project: { name: string } }) {
		await this.page.getByTestId("settings-tab-fee").click()
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

	// --- Logo & Favicon upload ---

	getLogoFileInput() {
		return this.page.locator("input[aria-label='Upload logo']")
	}

	getLogoRemoveButton() {
		return this.page.getByTestId("logo-remove")
	}

	getLogoPreview() {
		return this.page.getByTestId("logo-preview")
	}

	getFaviconFileInput() {
		return this.page.locator("input[aria-label='Upload favicon']")
	}

	getFaviconRemoveButton() {
		return this.page.getByTestId("favicon-remove")
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
	adminSubmissionsPage: AdminSubmissionsPage
	adminUsersPage: AdminUsersPage
	userDetailPage: UserDetailPage
	bulkActionDialog: BulkActionDialog
	adminSettingsPage: AdminSettingsPage
}

export const test = base.extend<AdminFixtures>({
	adminSubmissionsPage: async ({ page }, use) => {
		await use(new AdminSubmissionsPage(page))
	},
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
