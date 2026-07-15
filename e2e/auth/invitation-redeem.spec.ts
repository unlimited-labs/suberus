import { randomUUID } from "crypto"
import type { UserRole } from "@/generated/prisma/enums"
import { getPrisma, getTestUserIds } from "../helpers/test-db"
import { expect, getMailpitMessage, test, waitForEmail } from "./fixtures"

const PASSWORD = "ValidPassword123!"

interface SeedOptions {
	role?: UserRole
	status?: "PENDING" | "CANCELLED" | "EXPIRED"
	expiresAt?: Date
	email?: string
}

async function seedInvitation(opts: SeedOptions = {}) {
	const db = getPrisma()
	const { adminUserId } = await getTestUserIds()
	const id = randomUUID().slice(0, 8)

	return db.invitation.create({
		data: {
			email: opts.email ?? `invitee-${id}@e2e.local`,
			role: opts.role ?? "EDITOR",
			token: `inv-tok-${id}`,
			status: opts.status ?? "PENDING",
			expiresAt: opts.expiresAt ?? new Date(Date.now() + 72 * 60 * 60 * 1000),
			createdById: adminUserId,
		},
	})
}

/** Invitation FKs the user via usedById — always drop it before the user row. */
async function cleanup(email: string) {
	const db = getPrisma()
	await db.invitation.deleteMany({ where: { email: { equals: email, mode: "insensitive" } } })
	const user = await db.user.findFirst({
		where: { email: { equals: email, mode: "insensitive" } },
	})
	if (!user) return
	await db.activityLog.deleteMany({ where: { userId: user.id } })
	await db.session.deleteMany({ where: { userId: user.id } })
	await db.account.deleteMany({ where: { userId: user.id } })
	await db.user.delete({ where: { id: user.id } })
}

async function completeRegistration(
	registerPage: import("./fixtures").RegisterPage,
) {
	await registerPage.fillStep1({
		password: PASSWORD,
		confirmPassword: PASSWORD,
		firstName: "Invited",
		lastName: "User",
		affiliation: "Test University",
	})
	await registerPage.clickContinue()
	await registerPage.fillStep2({ country: "Poland", address: "Org\n1 St" })
	await registerPage.clickContinue()
	await registerPage.fillStep3({ acceptTerms: true })
	await registerPage.clickCreateAccount()
}

test.describe("Invitation redemption", () => {
	test("invited EDITOR holds the role immediately, before verifying email", async ({
		registerPage,
	}) => {
		test.slow()
		const invitation = await seedInvitation({ role: "EDITOR" })

		try {
			await registerPage.page.goto(`/register?token=${invitation.token}`)
			await expect(registerPage.page.getByText("You've been invited as")).toBeVisible()
			await completeRegistration(registerPage)
			await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })

			// The regression: the role used to wait for the verification link.
			const db = getPrisma()
			await expect
				.poll(
					async () =>
						db.user.findUnique({
							where: { email: invitation.email },
							select: { role: true, emailVerified: true },
						}),
					{ timeout: 10000 },
				)
				.toEqual({ role: "EDITOR", emailVerified: false })

			const used = await db.invitation.findUnique({ where: { id: invitation.id } })
			expect(used?.status).toBe("USED")
			expect(used?.usedById).not.toBeNull()
			expect(used?.roleAppliedAt).not.toBeNull()

			// Replaying the spent token must not re-open the invited flow.
			await registerPage.page.goto(`/register?token=${invitation.token}`)
			await expect(registerPage.page.getByText("You've been invited as")).not.toBeVisible()
		} finally {
			await cleanup(invitation.email)
		}
	})

	test("invited ADMIN can open the admin panel without verifying email", async ({
		registerPage,
	}) => {
		test.slow()
		const invitation = await seedInvitation({ role: "ADMIN" })

		try {
			await registerPage.page.goto(`/register?token=${invitation.token}`)
			await completeRegistration(registerPage)
			await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })

			await registerPage.page.goto("/admin/invitations")

			await expect(
				registerPage.page.getByRole("heading", { name: "Invitations" }),
			).toBeVisible({ timeout: 10000 })
		} finally {
			await cleanup(invitation.email)
		}
	})

	test("invitation addressed in mixed case still grants the role", async ({
		registerPage,
	}) => {
		test.slow()
		const id = randomUUID().slice(0, 8)
		const invitation = await seedInvitation({ email: `Invitee-${id}@E2E-Test.Local` })

		try {
			await registerPage.page.goto(`/register?token=${invitation.token}`)
			await completeRegistration(registerPage)
			await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })

			// Sign-up lower-cases the address; the invite must still match it.
			const db = getPrisma()
			await expect
				.poll(
					async () =>
						(
							await db.user.findFirst({
								where: { email: { equals: invitation.email, mode: "insensitive" } },
								select: { role: true },
							})
						)?.role,
					{ timeout: 10000 },
				)
				.toBe("EDITOR")
		} finally {
			await cleanup(invitation.email)
		}
	})

	test("invitation that expires before submit grants nothing and says so", async ({
		registerPage,
	}) => {
		test.slow()
		const invitation = await seedInvitation()

		try {
			await registerPage.page.goto(`/register?token=${invitation.token}`)
			await registerPage.fillStep1({
				password: PASSWORD,
				confirmPassword: PASSWORD,
				firstName: "Invited",
				lastName: "User",
				affiliation: "Test University",
			})
			await registerPage.clickContinue()
			await registerPage.fillStep2({ country: "Poland", address: "Org\n1 St" })
			await registerPage.clickContinue()
			await registerPage.fillStep3({ acceptTerms: true })

			// Status stays PENDING — this is the un-swept lazy-expiry state the old
			// consume accepted, since it only checked status.
			const db = getPrisma()
			await db.invitation.update({
				where: { id: invitation.id },
				data: { expiresAt: new Date(Date.now() - 1000) },
			})

			await registerPage.clickCreateAccount()

			await expect(
				registerPage.page.locator("[data-sonner-toast]").getByText(/invitation could not be applied/i),
			).toBeVisible({ timeout: 15000 })

			const user = await db.user.findUnique({
				where: { email: invitation.email },
				select: { role: true },
			})
			expect(user?.role).toBe("AUTHOR")

			const untouched = await db.invitation.findUnique({ where: { id: invitation.id } })
			expect(untouched?.status).toBe("PENDING")
			expect(untouched?.usedById).toBeNull()
		} finally {
			await cleanup(invitation.email)
		}
	})

	test("expired token does not open the invited flow", async ({ registerPage }) => {
		const invitation = await seedInvitation({
			expiresAt: new Date(Date.now() - 1000),
			status: "PENDING",
		})

		try {
			await registerPage.page.goto(`/register?token=${invitation.token}`)

			await expect(registerPage.page.getByText("You've been invited as")).not.toBeVisible()
			await expect(registerPage.page.getByLabel("E-mail *")).toBeEditable()
		} finally {
			await cleanup(invitation.email)
		}
	})

	test("cancelled token does not open the invited flow", async ({ registerPage }) => {
		const invitation = await seedInvitation({ status: "CANCELLED" })

		try {
			await registerPage.page.goto(`/register?token=${invitation.token}`)

			await expect(registerPage.page.getByText("You've been invited as")).not.toBeVisible()
			await expect(registerPage.page.getByLabel("E-mail *")).toBeEditable()
		} finally {
			await cleanup(invitation.email)
		}
	})

	test("invited user gets a locked email and no account-type chooser", async ({
		registerPage,
	}) => {
		const invitation = await seedInvitation({ role: "REVIEWER" })

		try {
			// Control first, so the absence below actually means something.
			await registerPage.goto()
			const chooser = registerPage.page.getByText("Participant", { exact: true })
			const chooserExists = await chooser.isVisible().catch(() => false)

			await registerPage.page.goto(`/register?token=${invitation.token}`)

			await expect(registerPage.page.getByText("You've been invited as")).toBeVisible()
			await expect(registerPage.page.getByText("Reviewer")).toBeVisible()
			const emailInput = registerPage.page.getByLabel("E-mail *")
			await expect(emailInput).toHaveValue(invitation.email)
			await expect(emailInput).not.toBeEditable()
			if (chooserExists) await expect(chooser).not.toBeVisible()
		} finally {
			await cleanup(invitation.email)
		}
	})

	test("verifying the email afterwards leaves the invited role untouched", async ({
		registerPage,
	}) => {
		test.slow()
		const invitation = await seedInvitation({ role: "EDITOR" })

		try {
			await registerPage.page.goto(`/register?token=${invitation.token}`)
			await completeRegistration(registerPage)
			await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })

			const mail = await waitForEmail(invitation.email, "verify", 60000)
			expect(mail).not.toBeNull()
			const full = (await getMailpitMessage((mail as { ID: string }).ID)) as {
				HTML?: string
				Text?: string
			} | null
			// EMAIL_VERIFICATION is plain text, so HTML comes back as "" — `??` would
			// keep the empty string rather than fall through to Text.
			const link = /https?:\/\/[^\s"'<>]*verify[^\s"'<>]*/i.exec(
				full?.HTML || full?.Text || "",
			)?.[0]
			expect(link).toBeTruthy()

			await registerPage.page.goto(link as string)

			// The deleted userEmailVerified handler used to set the role right here;
			// nothing on this path may touch it in either direction.
			const db = getPrisma()
			await expect
				.poll(
					async () =>
						db.user.findUnique({
							where: { email: invitation.email },
							select: { role: true, emailVerified: true },
						}),
					{ timeout: 15000 },
				)
				.toEqual({ role: "EDITOR", emailVerified: true })
		} finally {
			await cleanup(invitation.email)
		}
	})
})
