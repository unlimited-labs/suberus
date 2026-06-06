import { test, expect, ADMIN_USER, TEST_USER, UNVERIFIED_USER, ADMIN_VERIFY_TEST_USER, EDITOR_USER } from "./fixtures"
import { loginAs } from "../helpers/auth"

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

	test.describe("Column Visibility", () => {
		test("hides a column and shows it again from the Columns menu", async ({ adminUsersPage, page }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			const affiliationHeader = page
				.getByRole("columnheader")
				.filter({ hasText: "Affiliation" })
			await expect(affiliationHeader).toBeVisible()

			const columnsButton = page.getByRole("button", { name: "Columns" })

			// Act — hide the column
			await columnsButton.click()
			const item = page.getByRole("menuitemcheckbox", { name: "Affiliation" })
			await expect(item).toHaveAttribute("aria-checked", "true")
			await item.click()
			await page.keyboard.press("Escape")

			// Assert — column is hidden
			await expect(affiliationHeader).toBeHidden()

			// Act — reopen: the menu item must reflect the hidden state, then re-show
			await columnsButton.click()
			const itemAgain = page.getByRole("menuitemcheckbox", { name: "Affiliation" })
			await expect(itemAgain).toHaveAttribute("aria-checked", "false")
			await itemAgain.click()
			await page.keyboard.press("Escape")

			// Assert — column is visible again (regression: hide-but-cannot-show)
			await expect(affiliationHeader).toBeVisible()
		})

		test("keeps the Columns menu open and flips the checkbox in place", async ({ adminUsersPage, page }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await page.getByRole("button", { name: "Columns" }).click()
			const item = page.getByRole("menuitemcheckbox", { name: "Affiliation" })

			// Act & Assert — toggling does not close the menu; checkbox updates live
			await expect(item).toHaveAttribute("aria-checked", "true")
			await item.click()
			await expect(item).toHaveAttribute("aria-checked", "false")
			await item.click()
			await expect(item).toHaveAttribute("aria-checked", "true")
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

		test("email is a clickable mailto link", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Assert
			const mailtoLink = userDetailPage.page.getByRole("link", { name: TEST_USER.email })
			await expect(mailtoLink).toBeVisible()
			await expect(mailtoLink).toHaveAttribute("href", `mailto:${TEST_USER.email}`)
		})

		test("displays academic title label in header", async ({ adminUsersPage, userDetailPage }) => {
			// Arrange — set title on test user via Prisma
			const { getPrisma } = await import("../helpers/test-db")
			const db = getPrisma()
			await db.user.updateMany({ where: { email: TEST_USER.email }, data: { title: "dr" } })

			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Assert — CardTitle renders as div[data-slot="card-title"], not a heading
			await expect(userDetailPage.page.locator("[data-slot='card-title']").filter({ hasText: /^Dr\s/ })).toBeVisible()

			// Cleanup
			await db.user.updateMany({ where: { email: TEST_USER.email }, data: { title: null } })
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

	test.describe("Edit Profile", () => {
		test("Edit Profile button visible for admin", async ({ userDetailPage }) => {
			// Arrange
			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)

			// Assert
			await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })
		})

		test("Edit Profile dialog opens with user data", async ({ page, userDetailPage }) => {
			// Arrange
			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)
			await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })

			// Act
			await userDetailPage.editProfileButton.click()

			// Assert
			const dialog = page.getByRole("dialog")
			await dialog.waitFor({ state: "visible" })
			await expect(dialog.getByText("Edit User Profile")).toBeVisible()
			await expect(dialog.getByLabel("First name *")).toHaveValue(TEST_USER.firstName)
			await expect(dialog.getByLabel("Last name *")).toHaveValue(TEST_USER.lastName)
			await expect(dialog.getByLabel("Email *")).toHaveValue(TEST_USER.email)
		})

		test("can edit user profile", async ({ page, userDetailPage }) => {
			test.slow()
			// Arrange
			const { createTestUser, deleteTestUser } = await import("../helpers/test-db")
			const tempUser = await createTestUser({
				email: `edit-profile-${Date.now()}@e2e.local`,
				firstName: "EditBefore",
				lastName: "ProfileBefore",
			})

			try {
				await userDetailPage.goto(tempUser.id)
				await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })

				// Act
				await userDetailPage.editProfileButton.click()
				const dialog = page.getByRole("dialog")
				await dialog.waitFor({ state: "visible" })

				await dialog.getByLabel("First name *").clear()
				await dialog.getByLabel("First name *").fill("EditAfter")
				await dialog.getByLabel("Last name *").clear()
				await dialog.getByLabel("Last name *").fill("ProfileAfter")
				await dialog.getByRole("button", { name: "Save" }).click()

				// Assert
				await expect(page.getByText("Profile updated")).toBeVisible({ timeout: 5000 })
				await expect(page.locator("[data-slot='card-title']")).toContainText("EditAfter")
				await expect(page.locator("[data-slot='card-title']")).toContainText("ProfileAfter")
			} finally {
				await deleteTestUser(tempUser.id)
			}
		})

		test("can cancel edit without saving", async ({ page, userDetailPage }) => {
			// Arrange
			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)
			await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })

			// Act
			await userDetailPage.editProfileButton.click()
			const dialog = page.getByRole("dialog")
			await dialog.waitFor({ state: "visible" })
			await dialog.getByLabel("First name *").clear()
			await dialog.getByLabel("First name *").fill("ChangedName")
			await dialog.getByRole("button", { name: "Cancel" }).click()

			// Assert
			await expect(dialog).not.toBeVisible()
			await expect(page.locator("[data-slot='card-title']")).toContainText(TEST_USER.firstName)
		})

		test("duplicate email shows inline field error, not just a toast", async ({ page, userDetailPage }) => {
			test.slow()
			// Arrange — temp user we can safely mutate
			const { createTestUser, deleteTestUser } = await import("../helpers/test-db")
			const tempUser = await createTestUser({
				email: `dup-email-${Date.now()}@e2e.local`,
				firstName: "DupEmail",
				lastName: "User",
			})

			try {
				await userDetailPage.goto(tempUser.id)
				await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })
				await userDetailPage.editProfileButton.click()
				const dialog = page.getByRole("dialog")
				await dialog.waitFor({ state: "visible" })

				// Act — set email to an already-registered address (admin), then save.
				// Blur + value assertion ensure the change is committed to form state
				// before submit (otherwise an unchanged email submits successfully).
				const emailField = dialog.getByLabel("Email *")
				await emailField.clear()
				await emailField.fill(ADMIN_USER.email)
				await emailField.blur()
				await expect(emailField).toHaveValue(ADMIN_USER.email)
				await dialog.getByRole("button", { name: "Save" }).click()

				// Assert — inline error appears inside the dialog (server 409 → field error)
				await expect(dialog.getByText("Email already in use")).toBeVisible({ timeout: 5000 })
				// Dialog stays open (submit failed)
				await expect(dialog).toBeVisible()
				// 409 no longer raises a toast (field error replaces it)
				await expect(page.getByText("Profile updated")).not.toBeVisible()
			} finally {
				await deleteTestUser(tempUser.id)
			}
		})
	})

	test.describe("Delete User", () => {
		test("Delete User button visible for admin", async ({ userDetailPage }) => {
			// Arrange
			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)

			// Assert
			await expect(userDetailPage.deleteUserButton).toBeVisible({ timeout: 10000 })
		})

		test("shows blocking reasons for user with submissions", async ({ page, userDetailPage }) => {
			test.slow()
			// Arrange
			const { createTestUser, createSubmission, deleteSubmission, deleteTestUser } = await import("../helpers/test-db")
			const tempUser = await createTestUser({
				email: `delete-blocked-${Date.now()}@e2e.local`,
				firstName: "DeleteBlocked",
				lastName: "User",
			})
			const submission = await createSubmission({
				title: "blocking-submission",
				userId: tempUser.id,
			})

			try {
				await userDetailPage.goto(tempUser.id)
				await expect(userDetailPage.deleteUserButton).toBeVisible({ timeout: 10000 })

				// Act
				await userDetailPage.deleteUserButton.click()

				// Assert
				const dialog = page.getByRole("dialog")
				await dialog.waitFor({ state: "visible" })
				await expect(dialog.getByText("Cannot Delete User")).toBeVisible({ timeout: 5000 })
			} finally {
				await deleteSubmission(submission.id)
				await deleteTestUser(tempUser.id)
			}
		})

		test("can delete user without submissions", async ({ page, userDetailPage }) => {
			test.slow()
			// Arrange
			const { createTestUser } = await import("../helpers/test-db")
			const tempUser = await createTestUser({
				email: `delete-ok-${Date.now()}@e2e.local`,
				firstName: "DeleteOk",
				lastName: "User",
			})

			await userDetailPage.goto(tempUser.id)
			await expect(userDetailPage.deleteUserButton).toBeVisible({ timeout: 10000 })

			// Act
			await userDetailPage.deleteUserButton.click()
			const dialog = page.getByRole("dialog")
			await dialog.waitFor({ state: "visible" })
			await dialog.getByRole("button", { name: "Delete User" }).click()

			// Assert
			await expect(page).toHaveURL(/\/admin\/users$/, { timeout: 10000 })
			await expect(page.getByText("User deleted")).toBeVisible({ timeout: 5000 })
		})
	})

	test.describe("Editor Visibility", () => {
		test("Edit and Delete buttons not visible for editor", async ({ page, userDetailPage }) => {
			// Arrange — re-auth as editor
			await loginAs(page, EDITOR_USER, { clearCookies: true })

			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)
			await expect(userDetailPage.getUserEmail()).toBeVisible({ timeout: 10000 })

			// Assert
			await expect(userDetailPage.editProfileButton).not.toBeVisible()
			await expect(userDetailPage.deleteUserButton).not.toBeVisible()
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
