import { test, expect, ADMIN_USER, TEST_USER, UNVERIFIED_USER, ADMIN_VERIFY_TEST_USER } from "./fixtures"

// Desktop tests - skip on mobile since mobile shows cards instead of table
// Note: Authentication is handled via storageState in playwright.config.ts
test.describe("Admin Users Management", () => {
	test.beforeEach(async ({}, testInfo) => {
		// Setup: Skip table-based tests on mobile viewport
		test.skip(testInfo.project.name === "mobile-admin", "Table tests not applicable on mobile")
	})

	test.describe("Users List", () => {
		test("displays users list correctly", async ({ adminUsersPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			// Assert
			await expect(adminUsersPage.heading).toBeVisible()
			await expect(adminUsersPage.exportButton).toBeVisible()
			await expect(adminUsersPage.table).toBeVisible()
		})

		test("shows admin user in the list", async ({ adminUsersPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			// Act
			const adminRow = await adminUsersPage.getRowByEmail(ADMIN_USER)

			// Assert
			await expect(adminRow).toBeVisible()
		})

		test("search filters users correctly", async ({ adminUsersPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			// Act
			await adminUsersPage.search("Admin")

			// Assert
			const adminRow = await adminUsersPage.getRowByEmail(ADMIN_USER)
			await expect(adminRow).toBeVisible()
		})

		test("can select users for bulk actions", async ({ adminUsersPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			// Act
			await adminUsersPage.selectUser(TEST_USER)

			// Assert
			await expect(adminUsersPage.getSelectedCount()).toBeVisible()
		})

		test("export XLSX downloads a valid file", async ({ adminUsersPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			// Act
			const response = await adminUsersPage.page.request.get("/api/admin/users/export")

			// Assert
			expect(response.status()).toBe(200)
			expect(response.headers()["content-type"]).toContain("spreadsheetml.sheet")
			expect(response.headers()["content-disposition"]).toContain("attachment")
			const body = await response.body()
			expect(body.length).toBeGreaterThan(0)
		})
	})

	test.describe("User Detail Page", () => {
		test("displays user details correctly", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Assert
			await expect(userDetailPage.backButton).toBeVisible()
			await expect(userDetailPage.getUserEmail()).toContainText(TEST_USER.email)
		})

		test("shows change role button for admin", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Assert
			await expect(userDetailPage.changeRoleButton).toBeVisible()
		})

		test("shows deactivate/activate button", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Assert
			await expect(
				userDetailPage.deactivateButton.or(userDetailPage.activateButton)
			).toBeVisible()
		})

		test("can navigate back to users list", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Act
			await userDetailPage.backButton.click()

			// Assert
			await expect(adminUsersPage.page).toHaveURL(/\/admin\/users$/)
		})

		test("shows fee status section", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Assert
			await expect(
				userDetailPage.feeStatusPaid.or(userDetailPage.feeStatusUnpaid)
			).toBeVisible()
		})
	})

	test.describe("Bulk Actions", () => {
		test("bulk actions dropdown appears when users selected", async ({ adminUsersPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			// Act
			await adminUsersPage.selectUser(TEST_USER)

			// Assert
			await expect(adminUsersPage.page.getByText("Bulk actions")).toBeVisible()
		})

		test("can open mark fee paid dialog", async ({ adminUsersPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			// Act
			await adminUsersPage.selectUser(TEST_USER)
			await adminUsersPage.selectBulkAction("Mark fee paid")
			await adminUsersPage.clickApply()

			// Assert
			await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
			await expect(adminUsersPage.page.getByText("Mark fee as paid")).toBeVisible()
		})

		test("can open change role dialog", async ({ adminUsersPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			// Act
			await adminUsersPage.selectUser(TEST_USER)
			await adminUsersPage.selectBulkAction("Change role")
			await adminUsersPage.clickApply()

			// Assert
			await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
			await expect(adminUsersPage.page.getByText("Change user role")).toBeVisible()
		})
	})

	test.describe("Role Change", () => {
		test("change role dialog opens from detail page", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Act
			await userDetailPage.changeRoleButton.click()

			// Assert
			await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
			await expect(adminUsersPage.page.getByText("Change User Role")).toBeVisible()
		})

		test("can cancel role change", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Act
			await userDetailPage.changeRoleButton.click()
			await userDetailPage.cancelDialog()

			// Assert
			await expect(adminUsersPage.page.getByRole("dialog")).not.toBeVisible()
		})
	})

	test.describe("Fee Management", () => {
		test("mark fee paid button visible for unpaid users", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Assert (conditional - depends on user's fee status)
			const unpaidVisible = await userDetailPage.feeStatusUnpaid.isVisible()
			if (unpaidVisible) {
				await expect(userDetailPage.markAsPaidButton).toBeVisible()
			}
		})

		test("mark fee paid dialog opens correctly", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Act & Assert (conditional - depends on user's fee status)
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
			test.slow(); // Toggle + restore requires multiple mutations and query invalidations
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Act & Assert (toggle + cleanup - direction depends on current state)
			const deactivateVisible = await userDetailPage.deactivateButton.isVisible()
			if (deactivateVisible) {
				await userDetailPage.deactivateButton.click()
				await expect(userDetailPage.activateButton).toBeVisible({ timeout: 5000 })
				// Cleanup: restore original state
				await userDetailPage.activateButton.click()
				await expect(userDetailPage.deactivateButton).toBeVisible({ timeout: 5000 })
			} else {
				await userDetailPage.activateButton.click()
				await expect(userDetailPage.deactivateButton).toBeVisible({ timeout: 5000 })
				// Cleanup: restore original state
				await userDetailPage.deactivateButton.click()
				await expect(userDetailPage.activateButton).toBeVisible({ timeout: 5000 })
			}

			// Assert: no error toast appeared
			const errorToast = adminUsersPage.page.locator("[data-sonner-toast][data-type='error']")
			await expect(errorToast).not.toBeVisible({ timeout: 1000 })
		})
	})

	test.describe("Email Verification", () => {
		test("shows verified status for verified user", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Assert
			await expect(userDetailPage.emailVerified).toBeVisible()
			await expect(userDetailPage.verifyEmailButton).not.toBeVisible()
		})

		test("shows not verified status for unverified user", async ({
			adminUsersPage,
			userDetailPage,
		}) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(UNVERIFIED_USER)

			// Assert
			await expect(userDetailPage.emailNotVerified).toBeVisible()
			await expect(userDetailPage.verifyEmailButton).toBeVisible()
		})

		test("can manually verify user email", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange — ensure email is unverified (destructive test may have run before)
			const { getPrisma } = await import("../helpers/test-db")
			const db = getPrisma()
			await db.user.updateMany({
				where: { email: ADMIN_VERIFY_TEST_USER.email },
				data: { emailVerified: false },
			})

			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(ADMIN_VERIFY_TEST_USER)
			await expect(userDetailPage.emailNotVerified).toBeVisible()

			// Act
			await userDetailPage.verifyEmailButton.click()

			// Assert
			await expect(userDetailPage.emailVerified).toBeVisible({ timeout: 5000 })
			await expect(userDetailPage.verifyEmailButton).not.toBeVisible()
		})
	})
})

test.describe("Admin Users - Mobile", () => {
	test.use({ viewport: { width: 375, height: 667 } })

	// Note: Authentication is handled via storageState in playwright.config.ts

	test("displays mobile cards on small screens", async ({ adminUsersPage }) => {
		// Arrange
		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()

		// Assert
		await expect(adminUsersPage.heading).toBeVisible()
	})

	test("export button visible on mobile", async ({ adminUsersPage }) => {
		// Arrange
		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()

		// Assert
		await expect(adminUsersPage.exportButton).toBeVisible()
	})
})
