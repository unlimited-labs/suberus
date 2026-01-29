import type { Page, Locator } from "@playwright/test"

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
		this.table = page.locator("table")
		this.loadingText = page.getByText("Loading...")
	}

	async goto() {
		await this.page.goto("/admin/users")
	}

	async waitForLoad() {
		await this.loadingText.waitFor({ state: "hidden", timeout: 10000 })
	}

	async search(query: string) {
		await this.searchInput.fill(query)
		// Wait for table to re-filter
		await this.page.waitForTimeout(300)
	}

	async selectUser(email: string) {
		const row = this.page.locator("tr").filter({ hasText: email })
		await row.getByRole("checkbox").click()
		// Wait for React state to update
		await this.page.waitForTimeout(100)
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

	async openUserDetail(email: string) {
		const row = this.page.locator("tr").filter({ hasText: email })
		await row.getByRole("button", { name: "Actions menu" }).click()
		await this.page.getByRole("menuitem", { name: "View" }).click()
	}

	getRowByEmail(email: string) {
		return this.page.locator("tr").filter({ hasText: email })
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

	constructor(page: Page) {
		this.page = page
		this.backButton = page.getByRole("link", { name: "Back" })
		this.changeRoleButton = page.getByRole("button", { name: "Change Role" })
		this.deactivateButton = page.getByRole("button", { name: "Deactivate" })
		this.activateButton = page.getByRole("button", { name: "Activate" })
		this.markAsPaidButton = page.getByRole("button", { name: "Mark as Paid" })
		this.feeStatusPaid = page.getByText("Fee Paid")
		this.feeStatusUnpaid = page.getByText("Fee Unpaid")
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
