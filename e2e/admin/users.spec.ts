import { test, expect } from "@playwright/test"
import {
	loginAsAdmin,
	AdminUsersPage,
	UserDetailPage,
	ADMIN_USER,
	TEST_USER,
} from "./fixtures"

// Desktop tests - skip on mobile since mobile shows cards instead of table
test.describe("Admin Users Management", () => {
	test.beforeEach(async ({ page }, testInfo) => {
		// Skip table-based tests on mobile viewport
		test.skip(testInfo.project.name === "mobile", "Table tests not applicable on mobile")
		await loginAsAdmin(page)
	})

	test.describe("Users List", () => {
		test("displays users list correctly", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await expect(usersPage.heading).toBeVisible()
			await expect(usersPage.exportButton).toBeVisible()
			await expect(usersPage.table).toBeVisible()
		})

		test("shows admin user in the list", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			const adminRow = usersPage.getRowByEmail(ADMIN_USER.email)
			await expect(adminRow).toBeVisible()
		})

		test("search filters users correctly", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.search("admin")
			await page.waitForTimeout(300)

			const adminRow = usersPage.getRowByEmail(ADMIN_USER.email)
			await expect(adminRow).toBeVisible()
		})

		test("can select users for bulk actions", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.selectUser(TEST_USER.email)
			await expect(usersPage.getSelectedCount()).toBeVisible()
		})

		test("export XLSX button has correct link", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			const href = await usersPage.exportButton.getAttribute("href")
			expect(href).toContain("/api/admin/users/export")
		})
	})

	test.describe("User Detail Page", () => {
		test("displays user details correctly", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			await expect(detailPage.backButton).toBeVisible()
			await expect(detailPage.getUserEmail()).toContainText(TEST_USER.email)
		})

		test("shows change role button for admin", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			await expect(detailPage.changeRoleButton).toBeVisible()
		})

		test("shows deactivate/activate button", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			// Wait for page to load - one of these buttons should appear
			await expect(
				detailPage.deactivateButton.or(detailPage.activateButton)
			).toBeVisible()
		})

		test("can navigate back to users list", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			await detailPage.backButton.click()

			await expect(page).toHaveURL(/\/admin\/users$/)
		})

		test("shows fee status section", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			// Wait for page to load - one of these should appear
			await expect(
				detailPage.feeStatusPaid.or(detailPage.feeStatusUnpaid)
			).toBeVisible()
		})
	})

	test.describe("Bulk Actions", () => {
		test("bulk actions dropdown appears when users selected", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.selectUser(TEST_USER.email)
			await expect(page.getByText("Bulk actions")).toBeVisible()
		})

		test("can open mark fee paid dialog", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.selectUser(TEST_USER.email)
			await usersPage.selectBulkAction("Mark fee paid")
			await usersPage.clickApply()

			await expect(page.getByRole("dialog")).toBeVisible()
			await expect(page.getByText("Mark fee as paid")).toBeVisible()
		})

		test("can open change role dialog", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.selectUser(TEST_USER.email)
			await usersPage.selectBulkAction("Change role")
			await usersPage.clickApply()

			await expect(page.getByRole("dialog")).toBeVisible()
			await expect(page.getByText("Change user role")).toBeVisible()
		})
	})

	test.describe("Role Change", () => {
		test("change role dialog opens from detail page", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			await detailPage.changeRoleButton.click()

			await expect(page.getByRole("dialog")).toBeVisible()
			await expect(page.getByText("Change User Role")).toBeVisible()
		})

		test("can cancel role change", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			await detailPage.changeRoleButton.click()
			await detailPage.cancelDialog()

			await expect(page.getByRole("dialog")).not.toBeVisible()
		})
	})

	test.describe("Fee Management", () => {
		test("mark fee paid button visible for unpaid users", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			const unpaidVisible = await detailPage.feeStatusUnpaid.isVisible()
			if (unpaidVisible) {
				await expect(detailPage.markAsPaidButton).toBeVisible()
			}
		})

		test("mark fee paid dialog opens correctly", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			const unpaidVisible = await detailPage.feeStatusUnpaid.isVisible()
			if (unpaidVisible) {
				await detailPage.markAsPaidButton.click()
				await expect(page.getByRole("dialog")).toBeVisible()
				await expect(page.getByText("Mark Fee as Paid")).toBeVisible()
			}
		})
	})

	test.describe("User Status Toggle", () => {
		test("can toggle user active status", async ({ page }) => {
			const usersPage = new AdminUsersPage(page)
			await usersPage.goto()
			await usersPage.waitForLoad()

			await usersPage.openUserDetail(TEST_USER.email)

			const detailPage = new UserDetailPage(page)
			const deactivateVisible = await detailPage.deactivateButton.isVisible()
			if (deactivateVisible) {
				await detailPage.deactivateButton.click()
				await page.waitForTimeout(500)
			} else {
				await detailPage.activateButton.click()
				await page.waitForTimeout(500)
			}

			const errorToast = page.locator("[data-sonner-toast][data-type='error']")
			await expect(errorToast).not.toBeVisible({ timeout: 1000 })
		})
	})
})

test.describe("Admin Users - Mobile", () => {
	test.use({ viewport: { width: 375, height: 667 } })

	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page)
	})

	test("displays mobile cards on small screens", async ({ page }) => {
		const usersPage = new AdminUsersPage(page)
		await usersPage.goto()
		await usersPage.waitForLoad()
		await expect(usersPage.heading).toBeVisible()
	})

	test("export button visible on mobile", async ({ page }) => {
		const usersPage = new AdminUsersPage(page)
		await usersPage.goto()
		await usersPage.waitForLoad()
		await expect(usersPage.exportButton).toBeVisible()
	})
})
