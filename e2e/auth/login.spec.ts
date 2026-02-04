import { test, expect, TEST_USER, INVALID_USER } from "./fixtures"

test.describe("Login Page", () => {
	test("displays form correctly", async ({ loginPage }) => {
		// Arrange
		await loginPage.goto()

		// Assert
		await expect(loginPage.emailInput).toBeVisible()
		await expect(loginPage.passwordInput).toBeVisible()
		await expect(loginPage.submitButton).toBeVisible()
		await expect(loginPage.registerLink).toBeVisible()
		await expect(loginPage.forgotPasswordLink).toBeVisible()
	})

	test("shows error for empty email", async ({ loginPage }) => {
		// Arrange
		await loginPage.goto()

		// Act
		await loginPage.fillPassword("somepassword")
		await loginPage.submit()

		// Assert
		await expect(loginPage.page.getByText("Email is required")).toBeVisible()
	})

	test("shows error for invalid email format", async ({ loginPage }) => {
		// Arrange
		await loginPage.goto()

		// Act
		await loginPage.fillEmail("invalid-email")
		await loginPage.fillPassword("somepassword")
		await loginPage.submit()

		// Assert
		await expect(loginPage.page.getByText("Invalid email address")).toBeVisible()
	})

	test("shows error for empty password", async ({ loginPage }) => {
		// Arrange
		await loginPage.goto()

		// Act
		await loginPage.fillEmail("test@example.com")
		await loginPage.submit()

		// Assert
		await expect(loginPage.page.getByText("Password is required")).toBeVisible()
	})

	test("shows toast error for wrong credentials", async ({ loginPage }) => {
		// Arrange
		await loginPage.goto()

		// Act
		await loginPage.login(INVALID_USER.email, INVALID_USER.password)

		// Assert
		await expect(loginPage.page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 })
	})

	test("redirects to home after successful login", async ({ loginPage }) => {
		// Arrange
		await loginPage.goto()

		// Act
		await loginPage.login(TEST_USER.email, TEST_USER.password)

		// Assert
		await expect(loginPage.page).toHaveURL("/", { timeout: 30000 })
	})

	test("navigates to register page", async ({ loginPage }) => {
		// Arrange
		await loginPage.goto()

		// Act
		await loginPage.registerLink.click()

		// Assert
		await expect(loginPage.page).toHaveURL(/\/register/)
	})

	test("navigates to forgot password page", async ({ loginPage }) => {
		// Arrange
		await loginPage.goto()

		// Act
		await loginPage.forgotPasswordLink.click()

		// Assert
		await expect(loginPage.page).toHaveURL(/\/forgot-password/)
	})
})
