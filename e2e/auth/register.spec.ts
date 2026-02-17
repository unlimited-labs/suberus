import { test, expect, clearMailpit, waitForEmail } from "./fixtures"

test.describe("Register Page - Step 1: Author Info", () => {
	test("displays form correctly", async ({ registerPage }) => {
		// Arrange
		await registerPage.goto()

		// Assert
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
		// Arrange
		await registerPage.goto()

		// Act
		await registerPage.clickContinue()

		// Assert
		await expect(registerPage.page.getByText("Invalid email address")).toBeVisible()
		await expect(registerPage.page.getByText("Password is required")).toBeVisible()
		await expect(registerPage.page.getByText("First name is required")).toBeVisible()
		await expect(registerPage.page.getByText("Last name is required")).toBeVisible()
		await expect(registerPage.page.getByText("Affiliation is required")).toBeVisible()
	})

	test("shows error for password less than 10 characters", async ({ registerPage }) => {
		// Arrange
		await registerPage.goto()

		// Act
		await registerPage.page.getByLabel("Password *", { exact: true }).fill("short")
		await registerPage.clickContinue()

		// Assert
		await expect(registerPage.page.getByText("Password must be at least 10 characters")).toBeVisible()
	})

	test("shows error for password mismatch", async ({ registerPage }) => {
		// Arrange
		await registerPage.goto()

		// Act
		await registerPage.page.getByLabel("Password *", { exact: true }).fill("ValidPassword123!")
		await registerPage.page.getByLabel("Confirm Password *").fill("DifferentPassword123!")
		await registerPage.clickContinue()

		// Assert
		await expect(registerPage.page.getByText("Passwords do not match")).toBeVisible()
	})

	test("shows error for invalid email format", async ({ registerPage }) => {
		// Arrange
		await registerPage.goto()

		// Act
		await registerPage.page.getByLabel("E-mail *").fill("invalid-email")
		await registerPage.clickContinue()

		// Assert
		await expect(registerPage.page.getByText("Invalid email address")).toBeVisible()
	})

	test("title select dropdown works", async ({ registerPage }) => {
		// Arrange
		await registerPage.goto()
		const titleTrigger = registerPage.page.getByRole("group").filter({ has: registerPage.page.getByText("Title", { exact: true }) }).getByRole("combobox").first()

		// Act
		await titleTrigger.click()
		await expect(registerPage.page.getByRole("option", { name: "Dr." })).toBeVisible()
		await registerPage.page.getByRole("option", { name: "Dr." }).click()

		// Assert
		await expect(titleTrigger).toContainText("Dr.")
	})

	test("proceeds to step 2 with valid data", async ({ registerPage }) => {
		// Arrange
		await registerPage.goto()

		// Act
		await registerPage.fillStep1({
			email: "newuser@example.com",
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Test",
			lastName: "User",
			affiliation: "Test University",
		})
		await registerPage.clickContinue()

		// Assert - wait for step 2 to load (country combobox appears regardless of pre-fill)
		await registerPage.waitForStep2()
		// Address field may need scrolling on mobile
		await expect(registerPage.page.getByLabel("Address")).toBeAttached()
	})
})

test.describe("Register Page - Step 2: Invoice", () => {
	test.beforeEach(async ({ registerPage }) => {
		// Arrange
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
		await registerPage.waitForStep2()
	})

	test("shows error for required country", async ({ registerPage }) => {
		// Act — UTC timezone has no country mapping, so field is empty
		await registerPage.clickContinue()

		// Assert
		await expect(registerPage.page.getByText("Country is required")).toBeVisible()
	})

	test("country search and selection works", async ({ registerPage }) => {
		// Arrange
		const countryField = registerPage.page.locator('[data-slot="field"]').filter({ has: registerPage.page.getByText("Country *", { exact: true }) })
		const combobox = countryField.getByRole("combobox")

		// Act
		await combobox.click()
		await registerPage.page.getByPlaceholder("Search country...").fill("Poland")
		await registerPage.page.getByRole("option", { name: "Poland" }).click()

		// Assert
		await expect(combobox).toContainText("Poland")
	})

	test("back button preserves step 1 data", async ({ registerPage }) => {
		// Act
		await registerPage.clickBack()

		// Assert
		await expect(registerPage.page.getByLabel("E-mail *")).toHaveValue("newuser@example.com")
		await expect(registerPage.page.getByLabel("First name *")).toHaveValue("Test")
		await expect(registerPage.page.getByLabel("Last name *")).toHaveValue("User")
		await expect(registerPage.affiliationInput).toHaveValue("Test University")
	})

	test("proceeds to step 3 with valid data", async ({ registerPage }) => {
		// Act
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()

		// Assert
		await expect(registerPage.page.getByLabel(/I agree to the/)).toBeVisible()
		await expect(registerPage.createAccountButton).toBeVisible()
	})
})

test.describe("Register Page - Step 3: Survey", () => {
	test.beforeEach(async ({ registerPage }) => {
		// Arrange
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
		// Act
		await registerPage.clickCreateAccount()

		// Assert
		await expect(registerPage.page.getByText("You must accept the Terms of Service")).toBeVisible()
	})

	test("dynamic survey checkboxes are toggleable", async ({ registerPage }) => {
		// Arrange — questions seeded in global setup
		const visaCheckbox = registerPage.page.getByLabel(
			"Please send me an Invitation Letter for a Visa Application."
		)
		const certificateCheckbox = registerPage.page.getByLabel("I need a certificate of attendance.")
		await expect(visaCheckbox).not.toBeChecked()
		await expect(certificateCheckbox).not.toBeChecked()

		// Act
		await visaCheckbox.check()
		await certificateCheckbox.check()

		// Assert
		await expect(visaCheckbox).toBeChecked()
		await expect(certificateCheckbox).toBeChecked()

		// Act
		await visaCheckbox.uncheck()

		// Assert
		await expect(visaCheckbox).not.toBeChecked()
	})

	test("ToS link opens modal with content", async ({ registerPage }) => {
		// Act
		await registerPage.page.getByRole("button", { name: "Terms of Service" }).click()

		// Assert
		await expect(registerPage.page.getByRole("dialog")).toBeVisible()
		await expect(
			registerPage.page.getByRole("dialog").getByRole("heading", { name: "Terms of Service" }).first(),
		).toBeVisible()

		// Act — close modal
		await registerPage.page.getByRole("button", { name: "Close" }).first().click()

		// Assert
		await expect(registerPage.page.getByRole("dialog")).not.toBeVisible()
	})
})

test.describe("Register Page - Registration Flow", () => {
	test("successful registration redirects to dashboard with verification banner", async ({
		registerPage,
		testRun,
	}) => {
		// Arrange
		const uniqueEmail = `test-${testRun.testRunId}@e2e.local`
		await registerPage.goto()
		await registerPage.fillStep1({
			email: uniqueEmail,
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Test",
			lastName: "User",
			affiliation: "Test University",
		})
		await registerPage.clickContinue()
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })

		// Act
		await registerPage.clickCreateAccount()

		// Assert
		await expect(registerPage.page).toHaveURL("/", { timeout: 10000 })
		await expect(
			registerPage.page.getByText(/email.*not verified/i),
		).toBeVisible({ timeout: 5000 })
	})

	test("sends verification email on registration", async ({ registerPage, testRun }) => {
		test.setTimeout(180_000); // Full 3-step registration + email wait
		// Arrange
		await clearMailpit(testRun.testRunId)
		const uniqueEmail = `verify-${testRun.testRunId}@e2e.local`
		await registerPage.goto()
		await registerPage.fillStep1({
			email: uniqueEmail,
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Test",
			lastName: "User",
			affiliation: "Test University",
		})
		await registerPage.clickContinue()
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })

		// Act
		await registerPage.clickCreateAccount()

		// Assert
		await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })
		const email = await waitForEmail(uniqueEmail, "verify", 60000)
		expect(email).not.toBeNull()
		expect(email?.Subject).toContain("Verify")
	})
})

test.describe("Register Page - Navigation", () => {
	test("sign in link navigates to login page", async ({ registerPage }) => {
		// Arrange
		await registerPage.goto()

		// Act
		await registerPage.loginLink.click()

		// Assert
		await expect(registerPage.page).toHaveURL(/\/login/)
	})
})

test.describe("Register Page - Country Auto-Detection (no match)", () => {
	test.use({ timezoneId: "UTC" })

	test("shows empty country field when timezone has no country mapping", async ({ registerPage }) => {
		// Arrange
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
		await registerPage.waitForStep2()

		// Assert — UTC has no country mapping, field shows placeholder
		const countryField = registerPage.page.locator('[data-slot="field"]').filter({ has: registerPage.page.getByText("Country *", { exact: true }) })
		await expect(countryField.getByRole("combobox")).toContainText("Select country...")
	})
})

test.describe("Register Page - Country Auto-Detection", () => {
	test.use({ timezoneId: "Europe/Warsaw" })

	test("pre-fills country based on browser timezone", async ({ registerPage }) => {
		// Arrange
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
		await registerPage.waitForStep2()

		// Assert — Poland should be pre-selected from Europe/Warsaw timezone
		const countryField = registerPage.page.locator('[data-slot="field"]').filter({ has: registerPage.page.getByText("Country *", { exact: true }) })
		await expect(countryField.getByRole("combobox")).toContainText("Poland")
	})

	test("pre-filled country passes validation without manual selection", async ({ registerPage }) => {
		// Arrange
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
		await registerPage.waitForStep2()

		// Act — click Continue without manually selecting a country
		await registerPage.clickContinue()

		// Assert — should proceed to step 3 (terms checkbox visible)
		await expect(registerPage.page.getByLabel(/I agree to the/)).toBeVisible()
	})
})

// Mobile tests run automatically via "mobile" project in playwright.config.ts
// The mobile project uses iPhone 13 viewport for all tests
