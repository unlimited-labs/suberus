import { test, expect } from "./fixtures"

test.describe("Forgot Password Page", () => {
	test("displays form correctly", async ({ forgotPasswordPage }) => {
		await forgotPasswordPage.goto()

		await expect(forgotPasswordPage.emailInput).toBeVisible()
		await expect(forgotPasswordPage.submitButton).toBeVisible()
		await expect(forgotPasswordPage.backToLoginLink).toBeVisible()
	})

	test("shows error for empty email", async ({ forgotPasswordPage }) => {
		await forgotPasswordPage.goto()

		await forgotPasswordPage.submit()

		await expect(forgotPasswordPage.page.getByText("Invalid email address")).toBeVisible()
	})

	test("shows error for invalid email format", async ({ forgotPasswordPage }) => {
		await forgotPasswordPage.goto()

		await forgotPasswordPage.fillEmail("invalid-email")
		await forgotPasswordPage.submit()

		await expect(forgotPasswordPage.page.getByText("Invalid email address")).toBeVisible()
	})

	test("shows response after submit", async ({ forgotPasswordPage }) => {
		await forgotPasswordPage.goto()

		await forgotPasswordPage.fillEmail("test@example.com")
		await forgotPasswordPage.submit()

		await expect(
			forgotPasswordPage.successHeading.or(forgotPasswordPage.page.locator("[data-sonner-toast]"))
		).toBeVisible({ timeout: 10000 })
	})

	test("back to login link works", async ({ forgotPasswordPage }) => {
		await forgotPasswordPage.goto()

		await forgotPasswordPage.backToLoginLink.click()

		await expect(forgotPasswordPage.page).toHaveURL(/\/login/)
	})
})
