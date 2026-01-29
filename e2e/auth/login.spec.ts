import { test, expect } from "@playwright/test"
import { LoginPage, TEST_USER, INVALID_USER } from "./fixtures"

test.describe("Login Page", () => {
	test("displays form correctly", async ({ page }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()

		// Check form elements (heading is hidden on mobile)
		await expect(loginPage.emailInput).toBeVisible()
		await expect(loginPage.passwordInput).toBeVisible()
		await expect(loginPage.submitButton).toBeVisible()
		await expect(loginPage.registerLink).toBeVisible()
		await expect(loginPage.forgotPasswordLink).toBeVisible()
	})

	test("shows error for empty email", async ({ page }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()

		await loginPage.fillPassword("somepassword")
		await loginPage.submit()

		await expect(page.getByText("Email is required")).toBeVisible()
	})

	test("shows error for invalid email format", async ({ page }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()

		await loginPage.fillEmail("invalid-email")
		await loginPage.fillPassword("somepassword")
		await loginPage.submit()

		await expect(page.getByText("Invalid email address")).toBeVisible()
	})

	test("shows error for empty password", async ({ page }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()

		await loginPage.fillEmail("test@example.com")
		await loginPage.submit()

		await expect(page.getByText("Password is required")).toBeVisible()
	})

	test("shows toast error for wrong credentials", async ({ page }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()

		await loginPage.login(INVALID_USER.email, INVALID_USER.password)

		// Toast should appear with error message
		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 })
	})

	test("redirects to home after successful login", async ({ page }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()

		await loginPage.login(TEST_USER.email, TEST_USER.password)

		// Should redirect to home page after successful login
		await expect(page).toHaveURL("/", { timeout: 10000 })
	})

	test("navigates to register page", async ({ page }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()

		await loginPage.registerLink.click()

		await expect(page).toHaveURL(/\/register/)
	})

	test("navigates to forgot password page", async ({ page }) => {
		const loginPage = new LoginPage(page)
		await loginPage.goto()

		await loginPage.forgotPasswordLink.click()

		await expect(page).toHaveURL(/\/forgot-password/)
	})
})
