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

		const db = getPrisma()
		await db.invitation.deleteMany({ where: { email } })
	},
})

function invitationItem(page: Page, email: string) {
	return page.locator('[data-testid="invitation-item"]:visible').filter({ hasText: email })
}

async function openInviteDialog(page: Page) {
	await page.goto("/admin/invitations")
	await expect(page.getByRole("heading", { name: "Invitations" })).toBeVisible({ timeout: 10000 })
	await page.getByRole("button", { name: /Invite User/i }).click()
	const dialog = page.getByRole("dialog")
	await dialog.waitFor({ state: "visible" })
	return dialog
}

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
		const dialog = await openInviteDialog(page)
		await dialog.getByLabel("Email").fill(testEmail)
		await dialog.getByRole("combobox").click()
		await page.getByRole("option", { name: "Administrator" }).click()
		await dialog.getByRole("button", { name: /Send Invitation/i }).click()

		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation sent/i),
		).toBeVisible({ timeout: 10000 })
		await dialog.waitFor({ state: "hidden", timeout: 5000 })

		const item = invitationItem(page, testEmail)
		await expect(item).toBeVisible({ timeout: 5000 })
		await expect(item.getByText("Pending")).toBeVisible()
	})

	test("admin can send invitation with Reviewer role", async ({
		page,
		testEmail,
	}) => {
		const dialog = await openInviteDialog(page)
		await dialog.getByLabel("Email").fill(testEmail)
		await dialog.getByRole("button", { name: /Send Invitation/i }).click()

		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation sent/i),
		).toBeVisible({ timeout: 10000 })
		await dialog.waitFor({ state: "hidden", timeout: 5000 })

		await expect(invitationItem(page, testEmail)).toBeVisible({ timeout: 5000 })
	})

	test("invitation shows error for already registered email", async ({
		page,
	}) => {
		const dialog = await openInviteDialog(page)
		await dialog.getByLabel("Email").fill(TEST_USER.email)
		await dialog.getByRole("button", { name: /Send Invitation/i }).click()

		await expect(
			page.locator("[data-sonner-toast]").getByText(/already exists/i),
		).toBeVisible({ timeout: 10000 })
	})

	test("admin can cancel pending invitation", async ({
		page,
		testEmail,
	}) => {
		await sendInvitation(page, testEmail)

		const item = invitationItem(page, testEmail)
		await expect(item).toBeVisible({ timeout: 5000 })
		await item.getByRole("button", { name: "Cancel" }).click()

		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation cancelled/i),
		).toBeVisible({ timeout: 10000 })
		await expect(item.getByText("Cancelled")).toBeVisible({ timeout: 5000 })
	})

	test("admin can resend pending invitation", async ({
		page,
		testEmail,
	}) => {
		await sendInvitation(page, testEmail)

		const item = invitationItem(page, testEmail)
		await expect(item).toBeVisible({ timeout: 5000 })
		await item.getByRole("button", { name: "Resend" }).click()

		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation resent/i),
		).toBeVisible({ timeout: 10000 })
	})

	test("resend rotates the token: the old link dies, the new one works", async ({
		page,
		browser,
		testEmail,
	}) => {
		test.slow()
		await sendInvitation(page, testEmail)
		const db = getPrisma()
		const before = await db.invitation.findFirst({ where: { email: testEmail } })
		expect(before).not.toBeNull()

		const item = invitationItem(page, testEmail)
		await item.getByRole("button", { name: "Resend" }).click()
		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation resent/i),
		).toBeVisible({ timeout: 10000 })

		const after = await db.invitation.findFirst({ where: { email: testEmail } })
		expect(after?.id).toBe(before?.id)
		expect(after?.token).not.toBe(before?.token)
		expect(after?.status).toBe("PENDING")
		expect(after?.expiresAt.getTime()).toBeGreaterThan(
			before?.expiresAt.getTime() as number,
		)

		// The links themselves, from a signed-out context. newContext() does NOT
		// inherit the per-worker baseURL, and would silently hit worker 0's server.
		// newContext() inherits the project's admin storageState (and would land on
		// the dashboard, since /register redirects signed-in users), and not the
		// per-worker baseURL. Both must be overridden to get a true visitor.
		const ctx = await browser.newContext({
			baseURL: new URL(page.url()).origin,
			storageState: { cookies: [], origins: [] },
		})
		const anon = await ctx.newPage()
		try {
			await anon.goto(`/register?token=${after?.token}`)
			await expect(anon.getByText("You've been invited as")).toBeVisible()

			await anon.goto(`/register?token=${before?.token}`)
			await expect(anon.getByText("You've been invited as")).not.toBeVisible()
		} finally {
			await ctx.close()
		}
	})

	test("expired invitation can be resent, and the new link works", async ({
		page,
		browser,
		testEmail,
	}) => {
		test.slow()
		await sendInvitation(page, testEmail)
		const db = getPrisma()
		const seeded = await db.invitation.findFirst({ where: { email: testEmail } })
		await db.invitation.update({
			where: { id: seeded?.id as string },
			data: { expiresAt: new Date(Date.now() - 1000) },
		})

		await page.goto("/admin/invitations")
		const item = invitationItem(page, testEmail)
		await expect(item.getByText("Expired")).toBeVisible({ timeout: 10000 })
		await item.getByRole("button", { name: "Resend" }).click()
		await expect(
			page.locator("[data-sonner-toast]").getByText(/invitation resent/i),
		).toBeVisible({ timeout: 10000 })

		const after = await db.invitation.findFirst({ where: { email: testEmail } })
		expect(after?.status).toBe("PENDING")
		expect(after?.expiresAt.getTime()).toBeGreaterThan(Date.now())

		// newContext() inherits the project's admin storageState (and would land on
		// the dashboard, since /register redirects signed-in users), and not the
		// per-worker baseURL. Both must be overridden to get a true visitor.
		const ctx = await browser.newContext({
			baseURL: new URL(page.url()).origin,
			storageState: { cookies: [], origins: [] },
		})
		const anon = await ctx.newPage()
		try {
			await anon.goto(`/register?token=${after?.token}`)
			await expect(anon.getByText("You've been invited as")).toBeVisible()
		} finally {
			await ctx.close()
		}
	})

	test("used invitation offers no actions", async ({ page, testEmail }) => {
		await sendInvitation(page, testEmail)
		const db = getPrisma()
		const seeded = await db.invitation.findFirst({ where: { email: testEmail } })
		await db.invitation.update({
			where: { id: seeded?.id as string },
			data: { status: "USED", usedAt: new Date() },
		})

		await page.goto("/admin/invitations")
		const item = invitationItem(page, testEmail)

		await expect(item.getByText("Used")).toBeVisible({ timeout: 10000 })
		await expect(item.getByRole("button", { name: "Resend" })).not.toBeVisible()
		await expect(item.getByRole("button", { name: "Cancel" })).not.toBeVisible()
	})
})
