import { test as base, expect } from "../helpers/base-fixtures"
import { type Page } from "@playwright/test"
import { getPrisma } from "../helpers/test-db"
import { dismissViteOverlay } from "../helpers/page-setup"
import { TEST_USER } from "../helpers/test-users"
import { randomUUID } from "crypto"

const test = base.extend<{ testEmail: string }>({
	page: async ({ page }, use) => {
		await dismissViteOverlay(page)
		await use(page)
	},

	testEmail: async ({}, use) => {
		const email = `invite-${randomUUID().slice(0, 8)}@e2e-test.local`
		await use(email)

		// Cleanup - delete invitation by email
		const db = getPrisma()
		await db.invitation.deleteMany({ where: { email } })
	},
})

function invitationItem(page: Page, email: string) {
	return page.locator('[data-testid="invitation-item"]:visible').filter({ hasText: email })
}

/** Open the invitations page, launch the Invite User dialog, and return it. */
async function openInviteDialog(page: Page) {
	await page.goto("/admin/invitations")
	await expect(page.getByRole("heading", { name: "Invitations" })).toBeVisible({ timeout: 10000 })
	await page.getByRole("button", { name: /Invite User/i }).click()
	const dialog = page.getByRole("dialog")
	await dialog.waitFor({ state: "visible" })
	return dialog
}

/** Send an invitation for the given email and wait for the confirmation toast. */
async function sendInvitation(page: Page, email: string) {
	const dialog = await openInviteDialog(page)
	await dialog.getByLabel("Email").fill(email)
	await dialog.getByRole("button", { name: /Send Invitation/i }).click()
	await expect(
		page.locator("[data-sonner-toast]").getByText(/invitation sent/i),
	).toBeVisible({ timeout: 10000 })
	await dialog.waitFor({ state: "hidden", timeout: 5000 })
}

test.describe("Admin Invitations", () => {
	test("admin can send invitation with Administrator role", async ({
		page,
		testEmail,
	}) => {
		// Act
		const dialog = await openInviteDialog(page)
		await dialog.getByLabel("Email").fill(testEmail)
		await dialog.getByRole("combobox").click()
		await page.getByRole("option", { name: "Administrator" }).click()
		await dialog.getByRole("button", { name: /Send Invitation/i }).click()

		// Assert
		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation sent/i),
		).toBeVisible({ timeout: 10000 })
		await dialog.waitFor({ state: "hidden", timeout: 5000 })

		// Verify invitation appears
		const item = invitationItem(page, testEmail)
		await expect(item).toBeVisible({ timeout: 5000 })
		await expect(item.getByText("Pending")).toBeVisible()
	})

	test("admin can send invitation with Reviewer role", async ({
		page,
		testEmail,
	}) => {
		// Act - Reviewer is the default role
		const dialog = await openInviteDialog(page)
		await dialog.getByLabel("Email").fill(testEmail)
		await dialog.getByRole("button", { name: /Send Invitation/i }).click()

		// Assert
		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation sent/i),
		).toBeVisible({ timeout: 10000 })
		await dialog.waitFor({ state: "hidden", timeout: 5000 })

		await expect(invitationItem(page, testEmail)).toBeVisible({ timeout: 5000 })
	})

	test("invitation shows error for already registered email", async ({
		page,
	}) => {
		// Act - try to invite existing user
		const dialog = await openInviteDialog(page)
		await dialog.getByLabel("Email").fill(TEST_USER.email)
		await dialog.getByRole("button", { name: /Send Invitation/i }).click()

		// Assert
		await expect(
			page.locator("[data-sonner-toast]").getByText(/already exists/i),
		).toBeVisible({ timeout: 10000 })
	})

	test("admin can cancel pending invitation", async ({
		page,
		testEmail,
	}) => {
		// Arrange - create invitation first
		await sendInvitation(page, testEmail)

		// Act - cancel the invitation
		const item = invitationItem(page, testEmail)
		await expect(item).toBeVisible({ timeout: 5000 })
		await item.getByRole("button", { name: "Cancel" }).click()

		// Assert
		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation cancelled/i),
		).toBeVisible({ timeout: 10000 })
		await expect(item.getByText("Cancelled")).toBeVisible({ timeout: 5000 })
	})

	test("admin can resend pending invitation", async ({
		page,
		testEmail,
	}) => {
		// Arrange - create invitation first
		await sendInvitation(page, testEmail)

		// Act - resend the invitation
		const item = invitationItem(page, testEmail)
		await expect(item).toBeVisible({ timeout: 5000 })
		await item.getByRole("button", { name: "Resend" }).click()

		// Assert
		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation resent/i),
		).toBeVisible({ timeout: 10000 })
	})
})
