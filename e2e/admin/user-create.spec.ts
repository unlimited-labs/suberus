import { randomUUID } from "crypto"
import { type Page } from "@playwright/test"
import { loginAs } from "../helpers/auth"
import { mailpit, waitForEmail, workerFrom } from "../helpers/mailpit"
import {
	deleteTestUser,
	ensureSeededSurveyQuestions,
	getPrisma,
} from "../helpers/test-db"
import { expect, test } from "./fixtures"

const FORMAT_QUESTION = "Preferred session format"
const NEW_PASSWORD = "SetByTheUser123"

async function openCreateDialog(page: Page) {
	await page.goto("/admin/users")
	await expect(page.getByRole("heading", { name: "Users" })).toBeVisible({
		timeout: 15000,
	})
	await page.getByTestId("add-user-button").click()
	const dialog = page.getByRole("dialog")
	await dialog.waitFor({ state: "visible" })
	return dialog
}

async function fillRequiredFields(
	dialog: ReturnType<Page["getByRole"]>,
	page: Page,
	email: string,
) {
	await dialog.getByLabel(/First name/).fill("Created")
	await dialog.getByLabel(/Last name/).fill("ByAdmin")
	await dialog.getByLabel(/Email/).fill(email)

	const db = getPrisma()
	const question = await db.surveyQuestion.findFirstOrThrow({
		where: { label: FORMAT_QUESTION },
	})
	await dialog.locator(`#survey-${question.id}`).click()
	await page.getByRole("option", { name: "Poster" }).click()
}

test.describe("Admin creates a user", () => {
	const createdUserIds: string[] = []

	test.beforeEach(async () => {
		await ensureSeededSurveyQuestions()
	})

	test.afterEach(async () => {
		for (const id of createdUserIds.splice(0)) {
			await deleteTestUser(id).catch(() => {})
		}
	})

	test("creates an active account, mails the set-password link, and the user can log in", async ({
		page,
	}) => {
		// Arrange
		const email = `created-${randomUUID().slice(0, 8)}@e2e-test.local`

		// Act
		const dialog = await openCreateDialog(page)
		await fillRequiredFields(dialog, page, email)
		await dialog.getByRole("button", { name: /Create user/i }).click()

		// Assert - toast + dialog closed
		await expect(
			page.locator("[data-sonner-toast]").getByText(/user created/i),
		).toBeVisible({ timeout: 15000 })
		await dialog.waitFor({ state: "hidden", timeout: 10000 })

		// Assert - account is active and verified, survey answer stored
		const db = getPrisma()
		const user = await db.user.findUniqueOrThrow({
			where: { email },
			include: { surveyAnswers: true },
		})
		createdUserIds.push(user.id)
		expect(user.role).toBe("AUTHOR")
		expect(user.emailVerified).toBe(true)
		expect(user.isActive).toBe(true)
		expect(user.surveyAnswers.map((a) => a.value)).toContain("Poster")

		// Assert - exactly one email, and it is not the verification one
		const created = await waitForEmail(email, "account has been created")
		expect(created).not.toBeNull()
		const { messages } = await mailpit.searchMessages({
			query: `from:${workerFrom()} to:${email}`,
		})
		expect(messages).toHaveLength(1)

		// Act - follow the set-password link and log in with the new password
		const body = await mailpit.getMessageSummary(created!.ID)
		const link = body.Text.match(/https?:\/\/\S*reset-password\?token=\S+/)?.[0]
		expect(link).toBeTruthy()

		await page.context().clearCookies()
		await page.goto(link!)
		await page.getByLabel("New Password", { exact: true }).fill(NEW_PASSWORD)
		await page.getByLabel("Confirm Password", { exact: true }).fill(NEW_PASSWORD)
		await page.getByRole("button", { name: /reset password/i }).click()
		await expect(
			page.getByRole("heading", { name: /password reset successful/i }),
		).toBeVisible({ timeout: 15000 })

		await loginAs(page, { email, password: NEW_PASSWORD })
	})

	test("rejects an email that already exists", async ({ page }) => {
		// Arrange
		const db = getPrisma()
		const existing = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } })

		// Act - mixed case, since the server lowercases before its own check
		const dialog = await openCreateDialog(page)
		await fillRequiredFields(dialog, page, existing.email.toUpperCase())
		await dialog.getByRole("button", { name: /Create user/i }).click()

		// Assert
		await expect(dialog.getByText(/already in use/i)).toBeVisible({
			timeout: 15000,
		})
	})
})
