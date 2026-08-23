import { test, expect, ADMIN_USER, TEST_USER, UNVERIFIED_USER, ADMIN_VERIFY_TEST_USER, EDITOR_USER } from "./fixtures"
import { loginAs } from "../helpers/auth"
import { SubmissionStatus } from "../../src/generated/prisma/enums"
import { randomUUID } from "crypto"

// Desktop tests - skip on mobile since mobile shows cards instead of table
test.describe("Admin Users Management", () => {
	test.beforeEach(async ({}, testInfo) => {
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

		test("export XLSX downloads a valid file", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			const response = await adminUsersPage.page.request.get("/api/admin/users/export")

			expect(response.status()).toBe(200)
			expect(response.headers()["content-type"]).toContain("spreadsheetml.sheet")
			expect(response.headers()["content-disposition"]).toContain("attachment")
			const body = await response.body()
			expect(body.length).toBeGreaterThan(0)
		})
	})

	test.describe("Column Visibility", () => {
		test("hides a column and shows it again from the Columns menu", async ({ adminUsersPage, page }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			const affiliationHeader = page
				.getByRole("columnheader")
				.filter({ hasText: "Affiliation" })
			await expect(affiliationHeader).toBeVisible()

			const columnsButton = page.getByRole("button", { name: "Columns" })

			await columnsButton.click()
			const item = page.getByRole("menuitemcheckbox", { name: "Affiliation" })
			await expect(item).toHaveAttribute("aria-checked", "true")
			await item.click()
			await page.keyboard.press("Escape")

			await expect(affiliationHeader).toBeHidden()

			await columnsButton.click()
			const itemAgain = page.getByRole("menuitemcheckbox", { name: "Affiliation" })
			await expect(itemAgain).toHaveAttribute("aria-checked", "false")
			await itemAgain.click()
			await page.keyboard.press("Escape")

			await expect(affiliationHeader).toBeVisible()
		})

		test("keeps the Columns menu open and flips the checkbox in place", async ({ adminUsersPage, page }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await page.getByRole("button", { name: "Columns" }).click()
			const item = page.getByRole("menuitemcheckbox", { name: "Affiliation" })

			await expect(item).toHaveAttribute("aria-checked", "true")
			await item.click()
			await expect(item).toHaveAttribute("aria-checked", "false")
			await item.click()
			await expect(item).toHaveAttribute("aria-checked", "true")
		})

		test("persists hidden column across reload (localStorage)", async ({ adminUsersPage, page }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			const affiliationHeader = page
				.getByRole("columnheader")
				.filter({ hasText: "Affiliation" })
			await expect(affiliationHeader).toBeVisible()

			await page.getByRole("button", { name: "Columns" }).click()
			await page.getByRole("menuitemcheckbox", { name: "Affiliation" }).click()
			await page.keyboard.press("Escape")
			await expect(affiliationHeader).toBeHidden()

			await expect(async () => {
				const raw = await page.evaluate(() =>
					localStorage.getItem("suberus.table.columns.admin-users"),
				)
				expect(raw).toContain('"affiliation":false')
			}).toPass()

			await page.reload()
			await adminUsersPage.waitForLoad()

			await expect(affiliationHeader).toBeHidden()
			await page.getByRole("button", { name: "Columns" }).click()
			await expect(
				page.getByRole("menuitemcheckbox", { name: "Affiliation" }),
			).toHaveAttribute("aria-checked", "false")
		})
	})

	test.describe("Column Filter (faceted)", () => {
		const openRoleFilter = (page: import("@playwright/test").Page) =>
			page
				.getByRole("columnheader")
				.filter({ hasText: "Role" })
				.getByRole("button", { name: "Filter" })
				.click()

		test("Role filter checkbox checks in place, narrows, and unchecks", async ({
			adminUsersPage,
			page,
		}) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			const visibleRows = page.getByTestId("user-row").filter({ visible: true })
			const before = await visibleRows.count()
			expect(before).toBeGreaterThan(1)

			await openRoleFilter(page)
			const popover = page.locator("[data-slot='popover-content']")
			const adminOption = popover.getByRole("checkbox", { name: "Administrator" })

			await expect(adminOption).toHaveAttribute("aria-checked", "false")
			await adminOption.click()

			await expect(adminOption).toHaveAttribute("aria-checked", "true")
			const filtered = await visibleRows.count()
			expect(filtered).toBeGreaterThan(0)
			expect(filtered).toBeLessThan(before)

			await adminOption.click()

			await expect(adminOption).toHaveAttribute("aria-checked", "false")
			await expect(visibleRows).toHaveCount(before)
		})

		test("Role filter selection persists across popover reopen", async ({
			adminUsersPage,
			page,
		}) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await openRoleFilter(page)
			const popover = page.locator("[data-slot='popover-content']")
			await popover.getByRole("checkbox", { name: "Administrator" }).click()
			await expect(
				popover.getByRole("checkbox", { name: "Administrator" }),
			).toHaveAttribute("aria-checked", "true")

			await page.keyboard.press("Escape")
			await expect(popover).toBeHidden()
			await openRoleFilter(page)

			await expect(
				page
					.locator("[data-slot='popover-content']")
					.getByRole("checkbox", { name: "Administrator" }),
			).toHaveAttribute("aria-checked", "true")
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

			await userDetailPage.openActions()
			await expect(userDetailPage.changeRoleButton).toBeVisible()
		})

		test("shows deactivate/activate button", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			await userDetailPage.openActions()
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

		test("email is a clickable mailto link", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			const mailtoLink = userDetailPage.page.getByRole("link", { name: TEST_USER.email })
			await expect(mailtoLink).toBeVisible()
			await expect(mailtoLink).toHaveAttribute("href", `mailto:${TEST_USER.email}`)
		})

		test("displays academic title label in header", async ({ adminUsersPage, userDetailPage }) => {
			const { getPrisma } = await import("../helpers/test-db")
			const db = getPrisma()
			await db.user.updateMany({ where: { email: TEST_USER.email }, data: { title: "dr" } })

			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			await expect(userDetailPage.page.locator("[data-slot='card-title']").filter({ hasText: /^Dr\s/ })).toBeVisible()

			await db.user.updateMany({ where: { email: TEST_USER.email }, data: { title: null } })
		})

		test("shows fee status section", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			await expect(
				userDetailPage.feeStatusPaid.or(userDetailPage.feeStatusUnpaid)
			).toBeVisible()
		})
	})

	test.describe("User Submissions Panel", () => {
		test("shows owned submission with Author badge and clickable title", async ({ page, userDetailPage }) => {
			test.slow()
			const { createTestUser, createSubmission, deleteSubmission, deleteTestUser } = await import("../helpers/test-db")
			const owner = await createTestUser({
				email: `subpanel-owner-${Date.now()}@e2e.local`,
				firstName: "SubPanel",
				lastName: "Owner",
			})
			const submission = await createSubmission({
				title: `owned-submission-${Date.now()}`,
				userId: owner.id,
				status: SubmissionStatus.SUBMITTED,
			})

			try {
				await userDetailPage.goto(owner.id)
				const row = userDetailPage.submissionRows.filter({ hasText: submission.title })
				await expect(row).toBeVisible({ timeout: 10000 })

				await expect(row.getByText("Author", { exact: true })).toBeVisible()
				await expect(row.getByText("Submitted", { exact: true })).toBeVisible()

				await row.getByRole("link", { name: submission.title }).click()
				await expect(page).toHaveURL(new RegExp(`/admin/submissions/${submission.id}`))
			} finally {
				await deleteSubmission(submission.id)
				await deleteTestUser(owner.id)
			}
		})

		test("shows co-authored submission with Co-author badge", async ({ userDetailPage }) => {
			test.slow()
			const { createTestUser, createSubmission, deleteSubmission, deleteTestUser } = await import("../helpers/test-db")
			const coAuthor = await createTestUser({
				email: `subpanel-coauthor-${Date.now()}@e2e.local`,
				firstName: "SubPanel",
				lastName: "CoAuthor",
			})
			const owner = await createTestUser({
				email: `subpanel-owner2-${Date.now()}@e2e.local`,
				firstName: "SubPanel",
				lastName: "Owner2",
			})
			const submission = await createSubmission({
				title: `coauthored-submission-${Date.now()}`,
				userId: owner.id,
				status: SubmissionStatus.SUBMITTED,
				extraAuthors: [
					{
						firstName: "SubPanel",
						lastName: "CoAuthor",
						email: coAuthor.email,
						userId: coAuthor.id,
					},
				],
			})

			try {
				await userDetailPage.goto(coAuthor.id)
				const row = userDetailPage.submissionRows.filter({ hasText: submission.title })
				await expect(row).toBeVisible({ timeout: 10000 })

				await expect(row.getByText("Co-author", { exact: true })).toBeVisible()
			} finally {
				await deleteSubmission(submission.id)
				await deleteTestUser(owner.id)
				await deleteTestUser(coAuthor.id)
			}
		})

		test("shows draft submissions", async ({ userDetailPage }) => {
			test.slow()
			const { createTestUser, createSubmission, deleteSubmission, deleteTestUser } = await import("../helpers/test-db")
			const owner = await createTestUser({
				email: `subpanel-draft-${Date.now()}@e2e.local`,
				firstName: "SubPanel",
				lastName: "Draft",
			})
			const submission = await createSubmission({
				title: `draft-submission-${Date.now()}`,
				userId: owner.id,
				status: SubmissionStatus.DRAFT,
			})

			try {
				await userDetailPage.goto(owner.id)
				const row = userDetailPage.submissionRows.filter({ hasText: submission.title })

				await expect(row).toBeVisible({ timeout: 10000 })
				await expect(row.getByText("Draft", { exact: true })).toBeVisible()
			} finally {
				await deleteSubmission(submission.id)
				await deleteTestUser(owner.id)
			}
		})

		test("user who owns AND co-authors the same submission appears once as Author", async ({ userDetailPage }) => {
			test.slow()
			const { createTestUser, createSubmission, deleteSubmission, deleteTestUser } = await import("../helpers/test-db")
			const owner = await createTestUser({
				email: `subpanel-dual-${Date.now()}@e2e.local`,
				firstName: "SubPanel",
				lastName: "Dual",
			})
			const submission = await createSubmission({
				title: `dual-role-submission-${Date.now()}`,
				userId: owner.id,
				status: SubmissionStatus.SUBMITTED,
				extraAuthors: [
					{
						firstName: "SubPanel",
						lastName: "Dual",
						email: owner.email,
						userId: owner.id,
					},
				],
			})

			try {
				await userDetailPage.goto(owner.id)
				const rows = userDetailPage.submissionRows.filter({ hasText: submission.title })

				await expect(rows).toHaveCount(1)
				await expect(rows.getByText("Author", { exact: true })).toBeVisible()
				await expect(rows.getByText("Co-author", { exact: true })).toHaveCount(0)
			} finally {
				await deleteSubmission(submission.id)
				await deleteTestUser(owner.id)
			}
		})

		test("unlinked co-author (no userId) does not appear on their detail page", async ({ userDetailPage }) => {
			test.slow()
			const { createTestUser, createSubmission, deleteSubmission, deleteTestUser } = await import("../helpers/test-db")
			const unlinked = await createTestUser({
				email: `subpanel-unlinked-${Date.now()}@e2e.local`,
				firstName: "SubPanel",
				lastName: "Unlinked",
			})
			const owner = await createTestUser({
				email: `subpanel-owner3-${Date.now()}@e2e.local`,
				firstName: "SubPanel",
				lastName: "Owner3",
			})
			const submission = await createSubmission({
				title: `unlinked-coauthor-submission-${Date.now()}`,
				userId: owner.id,
				status: SubmissionStatus.SUBMITTED,
				extraAuthors: [
					{
						firstName: "SubPanel",
						lastName: "Unlinked",
						email: unlinked.email,
					},
				],
			})

			try {
				await userDetailPage.goto(unlinked.id)
				await expect(userDetailPage.getUserEmail()).toBeVisible({ timeout: 10000 })

				await expect(userDetailPage.page.getByText("No submissions")).toBeVisible()
				await expect(userDetailPage.submissionRows).toHaveCount(0)
			} finally {
				await deleteSubmission(submission.id)
				await deleteTestUser(owner.id)
				await deleteTestUser(unlinked.id)
			}
		})

		test("submissions are ordered by last updated, newest first", async ({ userDetailPage }) => {
			test.slow()
			const { createTestUser, createSubmission, deleteSubmission, deleteTestUser, getPrisma } = await import("../helpers/test-db")
			const owner = await createTestUser({
				email: `subpanel-order-${Date.now()}@e2e.local`,
				firstName: "SubPanel",
				lastName: "Order",
			})
			const older = await createSubmission({
				title: `order-older-${Date.now()}`,
				userId: owner.id,
				status: SubmissionStatus.SUBMITTED,
			})
			const newer = await createSubmission({
				title: `order-newer-${Date.now()}`,
				userId: owner.id,
				status: SubmissionStatus.SUBMITTED,
			})
			const db = getPrisma()
			await db.submission.update({ where: { id: older.id }, data: { title: older.title } })

			try {
				await userDetailPage.goto(owner.id)
				await expect(userDetailPage.submissionRows).toHaveCount(2)

				await expect(userDetailPage.submissionRows.nth(0)).toContainText(older.title)
				await expect(userDetailPage.submissionRows.nth(1)).toContainText(newer.title)
			} finally {
				await deleteSubmission(older.id)
				await deleteSubmission(newer.id)
				await deleteTestUser(owner.id)
			}
		})

		test("shows empty state for user without submissions", async ({ userDetailPage }) => {
			const { createTestUser, deleteTestUser } = await import("../helpers/test-db")
			const lonely = await createTestUser({
				email: `subpanel-empty-${Date.now()}@e2e.local`,
				firstName: "SubPanel",
				lastName: "Empty",
			})

			try {
				await userDetailPage.goto(lonely.id)
				await expect(userDetailPage.getUserEmail()).toBeVisible({ timeout: 10000 })

				await expect(userDetailPage.page.getByText("No submissions")).toBeVisible()
				await expect(userDetailPage.submissionRows).toHaveCount(0)
			} finally {
				await deleteTestUser(lonely.id)
			}
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

			await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
			await expect(adminUsersPage.page.getByText("Mark fee as paid")).toBeVisible()
		})

		test("can open change role dialog", async ({ adminUsersPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()

			await adminUsersPage.selectUser(TEST_USER)
			await adminUsersPage.selectBulkAction("Change role")

			await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
			await expect(adminUsersPage.page.getByText("Change user role")).toBeVisible()
		})
	})

	test.describe("Role Change", () => {
		test("change role dialog opens from detail page", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			await userDetailPage.openActions()
			await userDetailPage.changeRoleButton.click()

			await expect(adminUsersPage.page.getByRole("dialog")).toBeVisible()
			await expect(adminUsersPage.page.getByText("Change User Role")).toBeVisible()
		})

		test("can cancel role change", async ({ adminUsersPage, userDetailPage }) => {
			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			await userDetailPage.openActions()
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
		test("can toggle user active status", async ({ adminUsersPage, userDetailPage, page }) => {
			test.slow(); // Toggle + restore requires multiple mutations and query invalidations
			// Start from a known state: the menu item shown depends on it, and a
			// sibling test may have left the seeded user deactivated.
			const { getPrisma } = await import("../helpers/test-db")
			await getPrisma().user.update({
				where: { email: TEST_USER.email },
				data: { isActive: true },
			})

			await adminUsersPage.goto()
			await adminUsersPage.waitForLoad()
			await adminUsersPage.openUserDetail(TEST_USER)

			// Each menu item selection closes the dropdown, so reopen between steps.
			await userDetailPage.openActions()
			await expect(userDetailPage.deactivateButton).toBeVisible({ timeout: 5000 })
			await userDetailPage.deactivateButton.click()
			await userDetailPage.openActions()
			await expect(userDetailPage.activateButton).toBeVisible({ timeout: 5000 })
			await userDetailPage.activateButton.click()
			await userDetailPage.openActions()
			await expect(userDetailPage.deactivateButton).toBeVisible({ timeout: 5000 })
			await page.keyboard.press("Escape")

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

			await userDetailPage.verifyEmailButton.click()

			await expect(userDetailPage.emailVerified).toBeVisible({ timeout: 5000 })
			await expect(userDetailPage.verifyEmailButton).not.toBeVisible()
		})

		test("verifying email links the user to co-author records", async ({
			adminUsersPage,
			userDetailPage,
		}) => {
			const { createSubmission, deleteSubmission, getPrisma } = await import(
				"../helpers/test-db"
			)
			const db = getPrisma()
			await db.user.updateMany({
				where: { email: ADMIN_VERIFY_TEST_USER.email },
				data: { emailVerified: false },
			})
			const submission = await createSubmission({
				testRunId: `e2e_${randomUUID().slice(0, 8)}`,
				title: "CoAuthor Link On Verify",
				extraAuthors: [
					{
						firstName: ADMIN_VERIFY_TEST_USER.firstName,
						lastName: ADMIN_VERIFY_TEST_USER.lastName,
						email: ADMIN_VERIFY_TEST_USER.email,
					},
				],
			})

			try {
				await adminUsersPage.goto()
				await adminUsersPage.waitForLoad()
				await adminUsersPage.openUserDetail(ADMIN_VERIFY_TEST_USER)

				await userDetailPage.verifyEmailButton.click()
				await expect(userDetailPage.emailVerified).toBeVisible({ timeout: 5000 })

				await expect
					.poll(
						async () =>
							(
								await db.submissionAuthor.findFirst({
									where: {
										submissionId: submission.id,
										email: ADMIN_VERIFY_TEST_USER.email,
									},
									select: { userId: true },
								})
							)?.userId ?? null,
						{ timeout: 5000 },
					)
					.not.toBeNull()
			} finally {
				await deleteSubmission(submission.id).catch(() => {})
			}
		})
	})

	test.describe("Edit Profile", () => {
		test("Edit Profile button visible for admin", async ({ userDetailPage }) => {
			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)

			await userDetailPage.openActions()
			await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })
		})

		test("Edit Profile dialog opens with user data", async ({ page, userDetailPage }) => {
			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)
			await userDetailPage.openActions()
			await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })

			await userDetailPage.editProfileButton.click()

			const dialog = page.getByRole("dialog")
			await dialog.waitFor({ state: "visible" })
			await expect(dialog.getByText("Edit User Profile")).toBeVisible()
			await expect(dialog.getByLabel("First name *")).toHaveValue(TEST_USER.firstName)
			await expect(dialog.getByLabel("Last name *")).toHaveValue(TEST_USER.lastName)
			await expect(dialog.getByLabel("Email *")).toHaveValue(TEST_USER.email)
		})

		test("can edit user profile", async ({ page, userDetailPage }) => {
			test.slow()
			const { createTestUser, deleteTestUser } = await import("../helpers/test-db")
			const tempUser = await createTestUser({
				email: `edit-profile-${Date.now()}@e2e.local`,
				firstName: "EditBefore",
				lastName: "ProfileBefore",
			})

			try {
				await userDetailPage.goto(tempUser.id)
				await userDetailPage.openActions()
			await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })

				await userDetailPage.editProfileButton.click()
				const dialog = page.getByRole("dialog")
				await dialog.waitFor({ state: "visible" })

				await dialog.getByLabel("First name *").clear()
				await dialog.getByLabel("First name *").fill("EditAfter")
				await dialog.getByLabel("Last name *").clear()
				await dialog.getByLabel("Last name *").fill("ProfileAfter")
				await dialog.getByRole("button", { name: "Save" }).click()

				await expect(page.getByText("Profile updated")).toBeVisible({ timeout: 5000 })
				await expect(page.locator("[data-slot='card-title']").first()).toContainText("EditAfter")
				await expect(page.locator("[data-slot='card-title']").first()).toContainText("ProfileAfter")
			} finally {
				await deleteTestUser(tempUser.id)
			}
		})

		test("can cancel edit without saving", async ({ page, userDetailPage }) => {
			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)
			await userDetailPage.openActions()
			await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })

			await userDetailPage.editProfileButton.click()
			const dialog = page.getByRole("dialog")
			await dialog.waitFor({ state: "visible" })
			await dialog.getByLabel("First name *").clear()
			await dialog.getByLabel("First name *").fill("ChangedName")
			await dialog.getByRole("button", { name: "Cancel" }).click()

			await expect(dialog).not.toBeVisible()
			await expect(page.locator("[data-slot='card-title']").first()).toContainText(TEST_USER.firstName)
		})

		test("duplicate email shows inline field error, not just a toast", async ({ page, userDetailPage }) => {
			test.slow()
			const { createTestUser, deleteTestUser } = await import("../helpers/test-db")
			const tempUser = await createTestUser({
				email: `dup-email-${Date.now()}@e2e.local`,
				firstName: "DupEmail",
				lastName: "User",
			})

			try {
				await userDetailPage.goto(tempUser.id)
				await userDetailPage.openActions()
			await expect(userDetailPage.editProfileButton).toBeVisible({ timeout: 10000 })
				await userDetailPage.editProfileButton.click()
				const dialog = page.getByRole("dialog")
				await dialog.waitFor({ state: "visible" })

				// Blur + value assertion ensure the change is committed to form state
				// before submit (otherwise an unchanged email submits successfully).
				const emailField = dialog.getByLabel("Email *")
				await emailField.clear()
				await emailField.fill(ADMIN_USER.email)
				await emailField.blur()
				await expect(emailField).toHaveValue(ADMIN_USER.email)
				await dialog.getByRole("button", { name: "Save" }).click()

				await expect(dialog.getByText("Email already in use")).toBeVisible({ timeout: 5000 })
				await expect(dialog).toBeVisible()
				await expect(page.getByText("Profile updated")).not.toBeVisible()
			} finally {
				await deleteTestUser(tempUser.id)
			}
		})
	})

	test.describe("Delete User", () => {
		test("Delete User button visible for admin", async ({ userDetailPage }) => {
			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)

			await userDetailPage.openActions()
			await expect(userDetailPage.deleteUserButton).toBeVisible({ timeout: 10000 })
		})

		test("shows blocking reasons for user with submissions", async ({ page, userDetailPage }) => {
			test.slow()
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
				await userDetailPage.openActions()
				await expect(userDetailPage.deleteUserButton).toBeVisible({ timeout: 10000 })

				await userDetailPage.deleteUserButton.click()

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
			const { createTestUser } = await import("../helpers/test-db")
			const tempUser = await createTestUser({
				email: `delete-ok-${Date.now()}@e2e.local`,
				firstName: "DeleteOk",
				lastName: "User",
			})

			await userDetailPage.goto(tempUser.id)
			await userDetailPage.openActions()
			await expect(userDetailPage.deleteUserButton).toBeVisible({ timeout: 10000 })

			await userDetailPage.deleteUserButton.click()
			const dialog = page.getByRole("dialog")
			await dialog.waitFor({ state: "visible" })
			await dialog.getByRole("button", { name: "Delete User" }).click()

			await expect(page).toHaveURL(/\/admin\/users$/, { timeout: 10000 })
			await expect(page.getByText("User deleted")).toBeVisible({ timeout: 5000 })
		})
	})

	test.describe("Editor Visibility", () => {
		test("Edit and Delete buttons not visible for editor", async ({ page, userDetailPage }) => {
			await loginAs(page, EDITOR_USER, { clearCookies: true })

			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)
			await expect(userDetailPage.getUserEmail()).toBeVisible({ timeout: 10000 })

			await userDetailPage.openActions()
			await expect(userDetailPage.editProfileButton).not.toBeVisible()
			await expect(userDetailPage.deleteUserButton).not.toBeVisible()
		})

		test("editor can change roles but the Administrator option is hidden", async ({ page, userDetailPage }) => {
			await loginAs(page, EDITOR_USER, { clearCookies: true })

			const { getTestUserIds } = await import("../helpers/test-db")
			const { testUserId } = await getTestUserIds()
			await userDetailPage.goto(testUserId)
			await expect(userDetailPage.getUserEmail()).toBeVisible({ timeout: 10000 })

			await userDetailPage.openActions()
			await expect(userDetailPage.changeRoleButton).toBeVisible()
			await userDetailPage.changeRoleButton.click()
			await page.getByRole("combobox").click()

			await expect(page.getByRole("option", { name: "Editor" })).toBeVisible()
			await expect(page.getByRole("option", { name: "Administrator" })).toHaveCount(0)
		})

		test("editor cannot change an admin's role", async ({ page, userDetailPage }) => {
			await loginAs(page, EDITOR_USER, { clearCookies: true })

			const { getPrisma } = await import("../helpers/test-db")
			const admin = await getPrisma().user.findFirstOrThrow({ where: { role: "ADMIN" } })
			await userDetailPage.goto(admin.id)
			await expect(userDetailPage.getUserEmail()).toBeVisible({ timeout: 10000 })

			await userDetailPage.openActions()
			await expect(userDetailPage.changeRoleButton).not.toBeVisible()
		})
	})
})

test.describe("Admin Users - Mobile", () => {
	test.use({ viewport: { width: 375, height: 667 } })

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
