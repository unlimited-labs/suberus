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
		await expect(page.getByLabel("E-mail *")).toBeVisible()
	})

	test("invitation bypasses registration lock", async ({ page }) => {
		await setAppSetting("REGISTRATION_LOCKED", true)

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

		await expect(
			page.getByRole("heading", { name: "Registration" }),
		).toBeVisible()
		await expect(page.getByText("You've been invited as")).toBeVisible()

		await db.invitation.delete({ where: { id: invitation.id } })
		await setAppSetting("REGISTRATION_LOCKED", false)
	})

	test("invited user completes registration while locked, keeping the role", async ({
		page,
	}) => {
		test.slow()
		await setAppSetting("REGISTRATION_LOCKED", true)

		const db = getPrisma()
		const { ADMIN_USER } = await import("../helpers/test-users")
		const admin = await db.user.findUnique({ where: { email: ADMIN_USER.email } })
		const email = `invite-locked-${Date.now()}@e2e.local`
		const invitation = await db.invitation.create({
			data: {
				email,
				role: "EDITOR",
				token: `locked-submit-${Date.now()}`,
				status: "PENDING",
				expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
				createdById: admin!.id,
			},
		})

		try {
			const { RegisterPage } = await import("./fixtures")
			const registerPage = new RegisterPage(page)
			await page.goto(`/register?token=${invitation.token}`)

			// Rendering the form is not enough — ensureRegistrationOpen re-checks the
			// lock at submit time and only the token short-circuits it.
			await registerPage.fillStep1({
				password: "ValidPassword123!",
				confirmPassword: "ValidPassword123!",
				firstName: "Locked",
				lastName: "Invitee",
				affiliation: "Test University",
			})
			await registerPage.clickContinue()
			await registerPage.fillStep2({ country: "Poland", address: "Org\n1 St" })
			await registerPage.clickContinue()
			await registerPage.fillStep3({ acceptTerms: true })
			await registerPage.clickCreateAccount()

			await expect(page).toHaveURL("/", { timeout: 15000 })
			await expect
				.poll(
					async () =>
						(
							await db.user.findUnique({
								where: { email },
								select: { role: true },
							})
						)?.role,
					{ timeout: 10000 },
				)
				.toBe("EDITOR")
		} finally {
			await db.invitation.deleteMany({ where: { email } })
			const user = await db.user.findUnique({ where: { email } })
			if (user) {
				await db.activityLog.deleteMany({ where: { userId: user.id } })
				await db.session.deleteMany({ where: { userId: user.id } })
				await db.account.deleteMany({ where: { userId: user.id } })
				await db.user.delete({ where: { id: user.id } })
			}
			await setAppSetting("REGISTRATION_LOCKED", false)
		}
	})

	test("invalid token does not open the gate while locked", async ({ page }) => {
		await setAppSetting("REGISTRATION_LOCKED", true)

		await page.goto("/register?token=definitely-not-a-real-token")

		await expect(
			page.getByRole("heading", { name: "Registration Closed" }),
		).toBeVisible()

		await setAppSetting("REGISTRATION_LOCKED", false)
	})
})
