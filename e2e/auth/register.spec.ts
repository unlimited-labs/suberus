import { test, expect, clearMailpit, waitForEmail } from "./fixtures"
import { getPrisma, setAppSetting } from "../helpers/test-db"

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

		await expect(registerPage.page.getByText("Invalid email address")).toBeVisible()
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
		const titleTrigger = registerPage.page.getByRole("group").filter({ has: registerPage.page.getByText("Title", { exact: true }) }).getByRole("combobox").first()

		await titleTrigger.click()
		await expect(registerPage.page.getByRole("option", { name: "Dr", exact: true })).toBeVisible()
		await registerPage.page.getByRole("option", { name: "Dr", exact: true }).click()

		await expect(titleTrigger).toContainText("Dr")
	})

	test("shows error for already registered email", async ({ registerPage }) => {
		await registerPage.goto()

		await registerPage.fillStep1({
			email: "test@e2e.local",
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "New",
			lastName: "Person",
			affiliation: "Test University",
		})
		await registerPage.clickContinue()

		await expect(registerPage.page.getByText("Email is already registered")).toBeVisible()
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

		// Assert - wait for step 2 to load (country combobox appears regardless of pre-fill)
		await registerPage.waitForStep2()
		await expect(registerPage.page.getByLabel("Billing details (organization)")).toBeAttached()
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
		await registerPage.waitForStep2()
	})

	test("shows error for required country", async ({ registerPage }) => {
		// Act — UTC timezone has no country mapping, so field is empty
		await registerPage.clickContinue()

		await expect(registerPage.page.getByText("Country is required")).toBeVisible()
	})

	test("country search and selection works", async ({ registerPage }) => {
		const countryField = registerPage.page.locator('[data-slot="field"]').filter({ has: registerPage.page.getByText("Country *", { exact: true }) })
		const combobox = countryField.getByRole("combobox")
		const searchInput = registerPage.page.getByPlaceholder("Search country...")

		// Act — retry click in case dropdown doesn't open immediately after step transition
		await expect(async () => {
			await combobox.click()
			await expect(searchInput).toBeVisible()
		}).toPass({ timeout: 10000 })
		await searchInput.fill("Poland")
		await registerPage.page.getByRole("option", { name: "Poland" }).click()

		await expect(combobox).toContainText("Poland")
	})

	test("back button preserves step 1 data", async ({ registerPage }) => {
		await registerPage.clickBack()

		await expect(registerPage.page.getByLabel("E-mail *")).toHaveValue("newuser@example.com")
		await expect(registerPage.page.getByLabel("First name *")).toHaveValue("Test")
		await expect(registerPage.page.getByLabel("Last name *")).toHaveValue("User")
		await expect(registerPage.affiliationInput).toHaveValue("Test University")
	})

	test("proceeds to step 3 with valid data", async ({ registerPage }) => {
		await registerPage.fillStep2({ country: "Poland", address: "Test Org\n123 Test St" })
		await registerPage.clickContinue()

		await expect(registerPage.page.getByRole("checkbox", { name: /I agree to the/ })).toBeVisible()
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
		await registerPage.fillStep2({ country: "Poland", address: "Test Org\n123 Test St" })
		await registerPage.clickContinue()
	})

	test("shows error when terms not accepted", async ({ registerPage }) => {
		await registerPage.clickCreateAccount()

		await expect(registerPage.page.getByText("You must accept the Terms of Service")).toBeVisible()
	})

	test("blocks account creation when a required survey question is unanswered", async ({ registerPage }) => {
		await registerPage.page.getByRole("checkbox", { name: /I agree to the/ }).check()

		await registerPage.clickCreateAccount()

		await expect(registerPage.page.getByText("This field is required")).toBeVisible()
		await expect(registerPage.createAccountButton).toBeVisible()
		await expect(registerPage.page).not.toHaveURL("/")
	})

	test("dynamic survey checkboxes are toggleable", async ({ registerPage }) => {
		const visaCheckbox = registerPage.page.getByRole("checkbox", {
			name: "Please send me an Invitation Letter for a Visa Application.",
		})
		const certificateCheckbox = registerPage.page.getByRole("checkbox", {
			name: "I need a certificate of attendance.",
		})
		await expect(visaCheckbox).not.toBeChecked()
		await expect(certificateCheckbox).not.toBeChecked()

		await visaCheckbox.check()
		await certificateCheckbox.check()

		await expect(visaCheckbox).toBeChecked()
		await expect(certificateCheckbox).toBeChecked()

		await visaCheckbox.uncheck()

		await expect(visaCheckbox).not.toBeChecked()
	})

	test("ToS link opens modal with content", async ({ registerPage }) => {
		await registerPage.page.getByRole("button", { name: "Terms of Service" }).click()

		await expect(registerPage.page.getByRole("dialog")).toBeVisible()
		await expect(
			registerPage.page.getByRole("dialog").getByRole("heading", { name: "Terms of Service" }).first(),
		).toBeVisible()

		await registerPage.page.getByRole("button", { name: "Close" }).first().click()

		await expect(registerPage.page.getByRole("dialog")).not.toBeVisible()
	})
})

test.describe("Register Page - Registration Flow", () => {
	test("successful registration redirects to dashboard with verification banner", async ({
		registerPage,
		testRun,
	}) => {
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
		await registerPage.fillStep2({ country: "Poland", address: "Test Org\n123 Test St" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })

		await registerPage.clickCreateAccount()

		await expect(registerPage.page).toHaveURL("/", { timeout: 10000 })
		await expect(
			registerPage.page.getByText(/email.*not verified/i),
		).toBeVisible({ timeout: 5000 })
	})

	test("stores the contact-details consent when the participant opts in", async ({
		registerPage,
		testRun,
	}) => {
		await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true)
		const uniqueEmail = `consent-${testRun.testRunId}@e2e.local`
		try {
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
			await registerPage.fillStep2({
				country: "Poland",
				address: "Test Org\n123 Test St",
			})
			await registerPage.clickContinue()
			await registerPage.fillStep3({ acceptTerms: true, contactConsent: true })

			await registerPage.clickCreateAccount()

			await expect(registerPage.page).toHaveURL("/", { timeout: 10000 })
			const user = await getPrisma().user.findUnique({
				where: { email: uniqueEmail },
				select: { contactConsent: true },
			})
			expect(user?.contactConsent).toBe(true)
		} finally {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", false)
		}
	})

	test("sends verification email on registration", async ({ registerPage, testRun }) => {
		test.setTimeout(180_000); // Full 3-step registration + email wait
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
		await registerPage.fillStep2({ country: "Poland", address: "Test Org\n123 Test St" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })

		await registerPage.clickCreateAccount()

		await expect(registerPage.page).toHaveURL("/", { timeout: 15000 })
		const email = await waitForEmail(uniqueEmail, "verify", 60000)
		expect(email).not.toBeNull()
		expect(email?.Subject).toContain("Verify")
	})
})

test.describe("Register Page - Navigation", () => {
	test("sign in link navigates to login page", async ({ registerPage }) => {
		await registerPage.goto()

		await registerPage.loginLink.click()

		await expect(registerPage.page).toHaveURL(/\/login/)
	})
})

test.describe("Register Page - Country Auto-Detection (no match)", () => {
	test.use({ timezoneId: "UTC" })

	test("shows empty country field when timezone has no country mapping", async ({ registerPage }) => {
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

		const countryField = registerPage.page.locator('[data-slot="field"]').filter({ has: registerPage.page.getByText("Country *", { exact: true }) })
		await expect(countryField.getByRole("combobox")).toContainText("Poland")
	})

	test("pre-filled country passes validation without manual selection", async ({ registerPage }) => {
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

		// Act — fill billing details (required when needInvoice is checked), then Continue
		await registerPage.page.getByLabel("Billing details (organization)").fill("Test Org\n123 Test St")
		await registerPage.clickContinue()

		await expect(registerPage.page.getByRole("checkbox", { name: /I agree to the/ })).toBeVisible()
	})
})
