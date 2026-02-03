import { test, expect, ADMIN_USER, TEST_USER, UNVERIFIED_USER, ADMIN_VERIFY_TEST_USER } from "./fixtures"

// Desktop tests - skip on mobile since mobile shows cards instead of table
// Note: Authentication is handled via storageState in playwright.config.ts
test.describe("Admin Users Management", () => {
	test.beforeEach(async ({}, testInfo) => {
		// Skip table-based tests on mobile viewport
		test.skip(testInfo.project.name === "mobile-admin", "Table tests not applicable on mobile")
	})

	test.describe("Users List", () => {
		test("displays users list correctly", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await expect(adminUsersPage.heading).toBeVisible()
			await expect(adminUsersPage.exportButton).toBeVisible()
			await expect(adminUsersPage.table).toBeVisible()
		})

		test("shows admin user in the list", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			const adminRow = await adminUsersPage.getRowByEmail(ADMIN_USER)
			await expect(adminRow).toBeVisible()
		})

		test("search filters users correctly", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.search("Admin")

			const adminRow = await adminUsersPage.getRowByEmail(ADMIN_USER)
			await expect(adminRow).toBeVisible()
		})

		test("can select users for bulk actions", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.selectUser(TEST_USER)
			await expect(adminUsersPage.getSelectedCount()).toBeVisible()
		})

		test("export XLSX button has correct link", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			const href = await adminUsersPage.exportButton.getAttribute("href")
			expect(href).toContain("/api/admin/users/export")
		})
	})

	test.describe("User Detail Page", () => {
		test("displays user details correctly", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			await expect(userDetailPage.backButton).toBeVisible()
			await expect(userDetailPage.getUserEmail()).toContainText(TEST_USER.email)
		})

		test("shows change role button for admin", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			await expect(userDetailPage.changeRoleButton).toBeVisible()
		})

		test("shows deactivate/activate button", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			// Wait for page to load - one of these buttons should appear
			await expect(
				userDetailPage.deactivateButton.or(userDetailPage.activateButton)
			).toBeVisible()
		})

		test("can navigate back to users list", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			await userDetailPage.backButton.click()

			await expect(adminUsersPage.page).toHaveURL(/\/admin\/users$/)
		})

		test("shows fee status section", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			// Wait for page to load - one of these should appear
			await expect(
				userDetailPage.feeStatusPaid.or(userDetailPage.feeStatusUnpaid)
			).toBeVisible()
		})
	})

	test.describe("Bulk Actions", () => {
		test("bulk actions dropdown appears when users selected", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.selectUser(TEST_USER)
			await expect(adminUsersPage.page.getByText("Bulk actions")).toBeVisible()
		})

		test("can open mark fee paid dialog", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.selectUser(TEST_USER)
			await adminUsersPage.selectBulkAction("Mark fee paid")
			await adminUsersPage.clickApply()

			await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
			await expect(adminUsersPage.page.getByText("Mark fee as paid")).toBeVisible()
		})

		test("can open change role dialog", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.selectUser(TEST_USER)
			await adminUsersPage.selectBulkAction("Change role")
			await adminUsersPage.clickApply()

			await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
			await expect(adminUsersPage.page.getByText("Change user role")).toBeVisible()
		})
	})

	test.describe("Role Change", () => {
		test("change role dialog opens from detail page", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			await userDetailPage.changeRoleButton.click()

			await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
			await expect(adminUsersPage.page.getByText("Change User Role")).toBeVisible()
		})

		test("can cancel role change", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			await userDetailPage.changeRoleButton.click()
			await userDetailPage.cancelDialog()

			await expect(adminUsersPage.page.getByRole("dialog")).not.toBeVisible()
		})
	})

	test.describe("Fee Management", () => {
		test("mark fee paid button visible for unpaid users", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			const unpaidVisible = await userDetailPage.feeStatusUnpaid.isVisible()
			if (unpaidVisible) {
				await expect(userDetailPage.markAsPaidButton).toBeVisible()
			}
		})

		test("mark fee paid dialog opens correctly", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			const unpaidVisible = await userDetailPage.feeStatusUnpaid.isVisible()
			if (unpaidVisible) {
				await userDetailPage.markAsPaidButton.click()
				await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
				await expect(adminUsersPage.page.getByText("Mark Fee as Paid")).toBeVisible()
			}
		})
	})

	test.describe("User Status Toggle", () => {
		test("can toggle user active status", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			const deactivateVisible = await userDetailPage.deactivateButton.isVisible()
			if (deactivateVisible) {
				// Toggle: Active -> Inactive
				await userDetailPage.deactivateButton.click()
				await expect(userDetailPage.activateButton).toBeVisible({ timeout: 5000 })

				// Cleanup: Restore original state (Inactive -> Active)
				await userDetailPage.activateButton.click()
				await expect(userDetailPage.deactivateButton).toBeVisible({ timeout: 5000 })
			} else {
				// Toggle: Inactive -> Active
				await userDetailPage.activateButton.click()
				await expect(userDetailPage.deactivateButton).toBeVisible({ timeout: 5000 })

				// Cleanup: Restore original state (Active -> Inactive)
				await userDetailPage.deactivateButton.click()
				await expect(userDetailPage.activateButton).toBeVisible({ timeout: 5000 })
			}

			const errorToast = adminUsersPage.page.locator("[data-sonner-toast][data-type='error']")
			await expect(errorToast).not.toBeVisible({ timeout: 1000 })
		})
	})

	test.describe("Email Verification", () => {
		test("shows verified status for verified user", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(TEST_USER)

			await expect(userDetailPage.emailVerified).toBeVisible()
			// Verify button should not be visible for verified user
			await expect(userDetailPage.verifyEmailButton).not.toBeVisible()
		})

		test("shows not verified status for unverified user", async ({
			adminUsersPage,
			userDetailPage,
		}) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(UNVERIFIED_USER)

			await expect(userDetailPage.emailNotVerified).toBeVisible()
			await expect(userDetailPage.verifyEmailButton).toBeVisible()
		})

		test("can manually verify user email", async ({ adminUsersPage, userDetailPage }) => {
			// Use dedicated test user for destructive test (will be verified and stay verified)
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.openUserDetail(ADMIN_VERIFY_TEST_USER)

			// Should show not verified
			await expect(userDetailPage.emailNotVerified).toBeVisible()

			// Click verify button
			await userDetailPage.verifyEmailButton.click()

			// Wait for action to complete - should now show verified
			await expect(userDetailPage.emailVerified).toBeVisible({ timeout: 5000 })
			await expect(userDetailPage.verifyEmailButton).not.toBeVisible()
		})
	})
})

test.describe("Admin Users - Mobile", () => {
	test.use({ viewport: { width: 375, height: 667 } })

	// Note: Authentication is handled via storageState in playwright.config.ts

	test("displays mobile cards on small screens", async ({ adminUsersPage }) => {
		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()
		await expect(adminUsersPage.heading).toBeVisible()
	})

	test("export button visible on mobile", async ({ adminUsersPage }) => {
		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()
		await expect(adminUsersPage.exportButton).toBeVisible()
	})
})
