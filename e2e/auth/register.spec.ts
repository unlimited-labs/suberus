import { test, expect } from "@playwright/test"
import { RegisterPage } from "./fixtures"

test.describe("Register Page - Step 1: Author Info", () => {
	test("displays form correctly", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		await expect(page.getByLabel("E-mail *")).toBeVisible()
		await expect(page.getByLabel("Password *", { exact: true })).toBeVisible()
		await expect(page.getByLabel("Confirm Password *")).toBeVisible()
		await expect(page.getByLabel("First name *")).toBeVisible()
		await expect(page.getByLabel("Last name *")).toBeVisible()
		await expect(page.getByPlaceholder("Type affiliation...")).toBeVisible()
		// Title is a select component, check for the label text instead
		await expect(page.getByText("Title", { exact: true })).toBeVisible()
		await expect(registerPage.continueButton).toBeVisible()
	})

	test("shows validation errors for required fields", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		await registerPage.clickContinue()

		await expect(page.getByText("Email is required")).toBeVisible()
		await expect(page.getByText("Password is required")).toBeVisible()
		await expect(page.getByText("First name is required")).toBeVisible()
		await expect(page.getByText("Last name is required")).toBeVisible()
		await expect(page.getByText("Affiliation is required")).toBeVisible()
	})

	test("shows error for password less than 10 characters", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		await page.getByLabel("Password *", { exact: true }).fill("short")
		await registerPage.clickContinue()

		await expect(page.getByText("Password must be at least 10 characters")).toBeVisible()
	})

	test("shows error for password mismatch", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		await page.getByLabel("Password *", { exact: true }).fill("ValidPassword123!")
		await page.getByLabel("Confirm Password *").fill("DifferentPassword123!")
		await registerPage.clickContinue()

		await expect(page.getByText("Passwords do not match")).toBeVisible()
	})

	test("shows error for invalid email format", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		await page.getByLabel("E-mail *").fill("invalid-email")
		await registerPage.clickContinue()

		await expect(page.getByText("Invalid email address")).toBeVisible()
	})

	test("title select dropdown works", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		// Title is the only combobox on step 1
		const titleTrigger = page.getByRole("combobox").first()
		await titleTrigger.click()
		await expect(page.getByRole("option", { name: "Dr." })).toBeVisible()
		await page.getByRole("option", { name: "Dr." }).click()

		await expect(titleTrigger).toContainText("Dr.")
	})

	test("proceeds to step 2 with valid data", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		await registerPage.fillStep1({
			email: "newuser@example.com",
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Test",
			lastName: "User",
			affiliation: "Test University",
		})

		await registerPage.clickContinue()

		// Should see step 2 content
		await expect(page.getByLabel("Address")).toBeVisible()
		await expect(page.getByText("Select country...")).toBeVisible()
	})
})

test.describe("Register Page - Step 2: Invoice", () => {
	test.beforeEach(async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		await registerPage.fillStep1({
			email: "newuser@example.com",
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Test",
			lastName: "User",
			affiliation: "Test University",
		})
		await registerPage.clickContinue()
	})

	test("shows error for required country", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.clickContinue()

		await expect(page.getByText("Country is required")).toBeVisible()
	})

	test("country search and selection works", async ({ page }) => {
		await page.getByRole("combobox").click()
		await page.getByPlaceholder("Search country...").fill("Poland")
		await page.getByRole("option", { name: "Poland" }).click()

		await expect(page.getByRole("combobox")).toContainText("Poland")
	})

	test("back button preserves step 1 data", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.clickBack()

		// Step 1 fields should still have values
		await expect(page.getByLabel("E-mail *")).toHaveValue("newuser@example.com")
		await expect(page.getByLabel("First name *")).toHaveValue("Test")
		await expect(page.getByLabel("Last name *")).toHaveValue("User")
		await expect(page.getByPlaceholder("Type affiliation...")).toHaveValue("Test University")
	})

	test("proceeds to step 3 with valid data", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()

		// Should see step 3 content
		await expect(page.getByLabel(/I agree to the/)).toBeVisible()
		await expect(registerPage.createAccountButton).toBeVisible()
	})
})

test.describe("Register Page - Step 3: Survey", () => {
	test.beforeEach(async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		await registerPage.fillStep1({
			email: "newuser@example.com",
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Test",
			lastName: "User",
			affiliation: "Test University",
		})
		await registerPage.clickContinue()

		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
	})

	test("shows error when terms not accepted", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.clickCreateAccount()

		await expect(page.getByText("You must accept the terms and conditions")).toBeVisible()
	})

	test("optional checkboxes are toggleable", async ({ page }) => {
		const visaCheckbox = page.getByLabel(
			"Please send me an Invitation Letter for a Visa Application."
		)
		const certificateCheckbox = page.getByLabel("I need a certificate of attendance.")

		await expect(visaCheckbox).not.toBeChecked()
		await expect(certificateCheckbox).not.toBeChecked()

		await visaCheckbox.check()
		await certificateCheckbox.check()

		await expect(visaCheckbox).toBeChecked()
		await expect(certificateCheckbox).toBeChecked()

		await visaCheckbox.uncheck()
		await expect(visaCheckbox).not.toBeChecked()
	})

	test("successful registration redirects to home", async ({ page }) => {
		const registerPage = new RegisterPage(page)

		// Use unique email for this test
		const uniqueEmail = `test-${Date.now()}@e2e.local`

		// Go back and change email to unique one
		await registerPage.clickBack()
		await registerPage.clickBack()
		await page.getByLabel("E-mail *").fill(uniqueEmail)
		await registerPage.clickContinue()
		await registerPage.clickContinue()

		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()

		// Should redirect to home page after successful registration
		await expect(page).toHaveURL("/", { timeout: 10000 })
	})
})

test.describe("Register Page - Navigation", () => {
	test("sign in link navigates to login page", async ({ page }) => {
		const registerPage = new RegisterPage(page)
		await registerPage.goto()

		await registerPage.loginLink.click()

		await expect(page).toHaveURL(/\/login/)
	})
})

// Mobile tests run automatically via "mobile" project in playwright.config.ts
// The mobile project uses iPhone 13 viewport for all tests
