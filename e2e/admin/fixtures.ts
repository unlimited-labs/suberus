import { test as base, type Page, type Locator, expect } from "@playwright/test"

// Test data
export const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
	firstName: "Admin",
	lastName: "User",
}

export const TEST_USER = {
	email: "test@e2e.local",
	firstName: "Test",
	lastName: "User",
}

export const UNVERIFIED_USER = {
	email: "unverified@e2e.local",
	firstName: "Unverified",
	lastName: "User",
}

// Separate user for destructive admin verification tests
export const ADMIN_VERIFY_TEST_USER = {
	email: "admin-verify-test@e2e.local",
	firstName: "AdminVerify",
	lastName: "Test",
}

// Login helper
export async function loginAsAdmin(page: Page) {
	await page.goto("/login")
	// Wait for the form to appear (spinner disappears)
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 60000 })
	await page.getByLabel("E-mail").fill(ADMIN_USER.email)
	await page.getByLabel("Password").fill(ADMIN_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	// Wait for redirect to home page
	await page.waitForURL("/", { timeout: 30000 })
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
		// Wait for loading to finish
		await this.loadingText.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {
			// Loading text might never appear - that's ok
		})
		// Wait for network requests to settle
		await this.page.waitForLoadState("networkidle")
	}

	async search(query: string) {
		// Clear previous search first
		await this.searchInput.clear()
		await this.searchInput.fill(query)
		// Wait a moment for the client-side filter to apply
		await this.page.waitForTimeout(300)
	}

	async selectUser(user: { email: string; firstName: string }) {
		// Search by firstName to filter the list (needed when many users exist)
		await this.search(user.firstName)
		// Find the row by the exact email text
		const row = this.page.locator("tr").filter({ has: this.page.locator(`text="${user.email}"`) })
		const checkbox = row.getByRole("checkbox")
		await checkbox.click()
		// Wait for checkbox to be checked
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

	async openUserDetail(user: { email: string; firstName: string }) {
		// Search by firstName to filter the list (needed when many users exist)
		await this.search(user.firstName)
		// Find the row by the exact email text
		const row = this.page.locator("tr").filter({ has: this.page.locator(`text="${user.email}"`) })
		await row.getByRole("button", { name: "Actions menu" }).click()
		await this.page.getByRole("menuitem", { name: "View" }).click()
	}

	async getRowByEmail(user: { email: string; firstName: string }) {
		// Search by firstName to filter the list (needed when many users exist)
		await this.search(user.firstName)
		// Find the row by the exact email text
		return this.page.locator("tr").filter({ has: this.page.locator(`text="${user.email}"`) })
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
		return this.page.locator("span").filter({ hasText: /@/ })
	}

	getRoleBadge() {
		return this.page.locator("[class*='badge']").first()
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

// Extended test with fixtures
interface AdminFixtures {
	adminUsersPage: AdminUsersPage
	userDetailPage: UserDetailPage
	bulkActionDialog: BulkActionDialog
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
})

export { expect } from "@playwright/test"
