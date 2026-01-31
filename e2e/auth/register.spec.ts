import { test, expect } from "./fixtures"

test.describe("Register Page - Step 1: Author Info", () => {
	test("displays form correctly", async ({ registerPage }) => {
		await registerPage.goto()

		await expect(registerPage.page.getByLabel("E-mail *")).toBeVisible()
		await expect(registerPage.page.getByLabel("Password *", { exact: true })).toBeVisible()
		await expect(registerPage.page.getByLabel("Confirm Password *")).toBeVisible()
		await expect(registerPage.page.getByLabel("First name *")).toBeVisible()
		await expect(registerPage.page.getByLabel("Last name *")).toBeVisible()
		await expect(registerPage.affiliationInput).toBeVisible()
		// Title is a select component, check for the label text instead
		await expect(registerPage.page.getByText("Title", { exact: true })).toBeVisible()
		await expect(registerPage.continueButton).toBeVisible()
	})

	test("shows validation errors for required fields", async ({ registerPage }) => {
		await registerPage.goto()

		await registerPage.clickContinue()

		await expect(registerPage.page.getByText("Email is required")).toBeVisible()
		await expect(registerPage.page.getByText("Password is required")).toBeVisible()
		await expect(registerPage.page.getByText("First name is required")).toBeVisible()
		await expect(registerPage.page.getByText("Last name is required")).toBeVisible()
		await expect(registerPage.page.getByText("Affiliation is required")).toBeVisible()
	})

	test("shows error for password less than 10 characters", async ({ registerPage }) => {
		await registerPage.goto()

		await registerPage.page.getByLabel("Password *", { exact: true }).fill("short")
		await registerPage.clickContinue()

		await expect(registerPage.page.getByText("Password must be at least 10 characters")).toBeVisible()
	})

	test("shows error for password mismatch", async ({ registerPage }) => {
		await registerPage.goto()

		await registerPage.page.getByLabel("Password *", { exact: true }).fill("ValidPassword123!")
		await registerPage.page.getByLabel("Confirm Password *").fill("DifferentPassword123!")
		await registerPage.clickContinue()

		await expect(registerPage.page.getByText("Passwords do not match")).toBeVisible()
	})

	test("shows error for invalid email format", async ({ registerPage }) => {
		await registerPage.goto()

		await registerPage.page.getByLabel("E-mail *").fill("invalid-email")
		await registerPage.clickContinue()

		await expect(registerPage.page.getByText("Invalid email address")).toBeVisible()
	})

	test("title select dropdown works", async ({ registerPage }) => {
		await registerPage.goto()

		// Title is the only combobox on step 1
		const titleTrigger = registerPage.page.getByRole("combobox").first()
		await titleTrigger.click()
		await expect(registerPage.page.getByRole("option", { name: "Dr." })).toBeVisible()
		await registerPage.page.getByRole("option", { name: "Dr." }).click()

		await expect(titleTrigger).toContainText("Dr.")
	})

	test("proceeds to step 2 with valid data", async ({ registerPage }) => {
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
		await expect(registerPage.page.getByLabel("Address")).toBeVisible()
		await expect(registerPage.page.getByText("Select country...")).toBeVisible()
	})
})

test.describe("Register Page - Step 2: Invoice", () => {
	test.beforeEach(async ({ registerPage }) => {
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

	test("shows error for required country", async ({ registerPage }) => {
		await registerPage.clickContinue()

		await expect(registerPage.page.getByText("Country is required")).toBeVisible()
	})

	test("country search and selection works", async ({ registerPage }) => {
		await registerPage.page.getByRole("combobox").click()
		await registerPage.page.getByPlaceholder("Search country...").fill("Poland")
		await registerPage.page.getByRole("option", { name: "Poland" }).click()

		await expect(registerPage.page.getByRole("combobox")).toContainText("Poland")
	})

	test("back button preserves step 1 data", async ({ registerPage }) => {
		await registerPage.clickBack()

		// Step 1 fields should still have values
		await expect(registerPage.page.getByLabel("E-mail *")).toHaveValue("newuser@example.com")
		await expect(registerPage.page.getByLabel("First name *")).toHaveValue("Test")
		await expect(registerPage.page.getByLabel("Last name *")).toHaveValue("User")
		await expect(registerPage.affiliationInput).toHaveValue("Test University")
	})

	test("proceeds to step 3 with valid data", async ({ registerPage }) => {
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()

		// Should see step 3 content
		await expect(registerPage.page.getByLabel(/I agree to the/)).toBeVisible()
		await expect(registerPage.createAccountButton).toBeVisible()
	})
})

test.describe("Register Page - Step 3: Survey", () => {
	test.beforeEach(async ({ registerPage }) => {
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

	test("shows error when terms not accepted", async ({ registerPage }) => {
		await registerPage.clickCreateAccount()

		await expect(registerPage.page.getByText("You must accept the terms and conditions")).toBeVisible()
	})

	test("optional checkboxes are toggleable", async ({ registerPage }) => {
		const visaCheckbox = registerPage.page.getByLabel(
			"Please send me an Invitation Letter for a Visa Application."
		)
		const certificateCheckbox = registerPage.page.getByLabel("I need a certificate of attendance.")

		await expect(visaCheckbox).not.toBeChecked()
		await expect(certificateCheckbox).not.toBeChecked()

		await visaCheckbox.check()
		await certificateCheckbox.check()

		await expect(visaCheckbox).toBeChecked()
		await expect(certificateCheckbox).toBeChecked()

		await visaCheckbox.uncheck()
		await expect(visaCheckbox).not.toBeChecked()
	})

	test("successful registration redirects to home", async ({ registerPage }) => {
		// Use unique email for this test
		const uniqueEmail = `test-${Date.now()}@e2e.local`

		// Go back and change email to unique one
		await registerPage.clickBack()
		await registerPage.clickBack()
		await registerPage.page.getByLabel("E-mail *").fill(uniqueEmail)
		await registerPage.clickContinue()
		await registerPage.clickContinue()

		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()

		// Should redirect to home page after successful registration
		await expect(registerPage.page).toHaveURL("/", { timeout: 10000 })
	})
})

test.describe("Register Page - Navigation", () => {
	test("sign in link navigates to login page", async ({ registerPage }) => {
		await registerPage.goto()

		await registerPage.loginLink.click()

		await expect(registerPage.page).toHaveURL(/\/login/)
	})
})

// Mobile tests run automatically via "mobile" project in playwright.config.ts
// The mobile project uses iPhone 13 viewport for all tests
