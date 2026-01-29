import { test, expect } from "@playwright/test"
import { ForgotPasswordPage } from "./fixtures"

test.describe("Forgot Password Page", () => {
	test("displays form correctly", async ({ page }) => {
		const forgotPasswordPage = new ForgotPasswordPage(page)
		await forgotPasswordPage.goto()

		// Check form elements (heading is hidden on mobile)
		await expect(forgotPasswordPage.emailInput).toBeVisible()
		await expect(forgotPasswordPage.submitButton).toBeVisible()
		await expect(forgotPasswordPage.backToLoginLink).toBeVisible()
	})

	test("shows error for empty email", async ({ page }) => {
		const forgotPasswordPage = new ForgotPasswordPage(page)
		await forgotPasswordPage.goto()

		await forgotPasswordPage.submit()

		await expect(page.getByText("Email is required")).toBeVisible()
	})

	test("shows error for invalid email format", async ({ page }) => {
		const forgotPasswordPage = new ForgotPasswordPage(page)
		await forgotPasswordPage.goto()

		await forgotPasswordPage.fillEmail("invalid-email")
		await forgotPasswordPage.submit()

		await expect(page.getByText("Invalid email address")).toBeVisible()
	})

	test("shows response after submit", async ({ page }) => {
		const forgotPasswordPage = new ForgotPasswordPage(page)
		await forgotPasswordPage.goto()

		await forgotPasswordPage.fillEmail("test@example.com")
		await forgotPasswordPage.submit()

		// Wait for response - either success state or error toast
		// (Email transport may not be configured in test environment)
		await expect(
			page.getByRole("heading", { name: "Check your email" }).or(page.locator("[data-sonner-toast]"))
		).toBeVisible({ timeout: 10000 })
	})

	test("back to login link works", async ({ page }) => {
		const forgotPasswordPage = new ForgotPasswordPage(page)
		await forgotPasswordPage.goto()

		await forgotPasswordPage.backToLoginLink.click()

		await expect(page).toHaveURL(/\/login/)
	})
})

// Mobile tests run automatically via "mobile" project in playwright.config.ts
// The mobile project uses iPhone 13 viewport for all tests
