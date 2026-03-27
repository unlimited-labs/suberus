import { test, expect } from "../helpers/base-fixtures"
import { setAppSetting, getPrisma } from "../helpers/test-db"

test.describe.serial("Registration deadline & lock", () => {
	test.afterAll(async () => {
		await setAppSetting("REGISTRATION_LOCKED", false)
		await setAppSetting("REGISTRATION_DEADLINE", "")
	})

	test("shows closed page when registration deadline passed", async ({
		page,
	}) => {
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0]
		await setAppSetting("REGISTRATION_DEADLINE", yesterday)

		await page.goto("/register")

		await expect(
			page.getByRole("heading", { name: "Registration Closed" }),
		).toBeVisible()
		await expect(
			page.getByText("Registration is currently closed"),
		).toBeVisible()
		await expect(
			page.getByRole("link", { name: "sign in" }),
		).toBeVisible()
	})

	test("shows closed page when registration is locked", async ({ page }) => {
		await setAppSetting("REGISTRATION_DEADLINE", "")
		await setAppSetting("REGISTRATION_LOCKED", true)

		await page.goto("/register")

		await expect(
			page.getByRole("heading", { name: "Registration Closed" }),
		).toBeVisible()
	})

	test("allows registration when no deadline and not locked", async ({
		page,
	}) => {
		await setAppSetting("REGISTRATION_LOCKED", false)
		await setAppSetting("REGISTRATION_DEADLINE", "")

		await page.goto("/register")

		await expect(
			page.getByRole("heading", { name: "Registration" }),
		).toBeVisible()
		// Form should be shown
		await expect(page.getByLabel("E-mail *")).toBeVisible()
	})

	test("invitation bypasses registration lock", async ({ page }) => {
		await setAppSetting("REGISTRATION_LOCKED", true)

		// Create an invitation token
		const db = getPrisma()
		const { ADMIN_USER } = await import("../helpers/test-users")
		const admin = await db.user.findUnique({
			where: { email: ADMIN_USER.email },
		})
		const invitation = await db.invitation.create({
			data: {
				email: "invite-lock-test@e2e.local",
				role: "REVIEWER",
				token: `lock-test-${Date.now()}`,
				status: "PENDING",
				expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
				createdById: admin!.id,
			},
		})

		await page.goto(`/register?token=${invitation.token}`)

		// Should show the registration form, NOT the closed page
		await expect(
			page.getByRole("heading", { name: "Registration" }),
		).toBeVisible()
		await expect(page.getByText("You've been invited as")).toBeVisible()

		// Clean up invitation
		await db.invitation.delete({ where: { id: invitation.id } })
		await setAppSetting("REGISTRATION_LOCKED", false)
	})
})
