import { test, expect, TEST_USER, VALID_ORCID } from "./fixtures"

const TEST_EMAIL = TEST_USER.email

test.describe("User Settings", () => {
	// storageState is already set in playwright.config.ts for profile tests

	test("displays settings page with all sections", async ({ settingsPage }) => {
		await settingsPage.goto()

		await expect(settingsPage.heading).toBeVisible()
		await expect(settingsPage.firstNameInput).toBeVisible()
		await expect(settingsPage.lastNameInput).toBeVisible()
		await expect(settingsPage.orcidInput).toBeVisible()
		await expect(settingsPage.websiteInput).toBeVisible()
		await expect(settingsPage.linkedinInput).toBeVisible()
		await expect(settingsPage.savePersonalBtn).toBeVisible()
		await expect(settingsPage.needInvoiceCheckbox).toBeVisible()
		await expect(settingsPage.needInvoiceCheckbox).toBeChecked()
		await expect(settingsPage.addressInput).toBeVisible()
		await expect(settingsPage.saveContactBtn).toBeVisible()
		await expect(settingsPage.currentPasswordInput).toBeVisible()
		await expect(settingsPage.newPasswordInput).toBeVisible()
		await expect(settingsPage.confirmPasswordInput).toBeVisible()
		await expect(settingsPage.changePasswordBtn).toBeVisible()
	})

	test("shows initial user data in personal info form", async ({ settingsPage }) => {
		await settingsPage.goto()

		await expect(settingsPage.firstNameInput).toHaveValue(TEST_USER.firstName)
		await expect(settingsPage.lastNameInput).toHaveValue(TEST_USER.lastName)
	})

	test("validates required fields in personal info", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo({ firstName: "", lastName: "" })
		await settingsPage.savePersonalInfo()

		await expect(settingsPage.page.getByText(/first name.*required/i)).toBeVisible()
		await expect(settingsPage.page.getByText(/last name.*required/i)).toBeVisible()
	})

	test("validates ORCID format", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo({ orcid: "invalid-orcid" })
		await settingsPage.savePersonalInfo()

		await expect(settingsPage.page.getByText(/invalid orcid format/i)).toBeVisible()
	})

	test("validates website and LinkedIn URLs", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo({ website: "notaurl", linkedin: "notaurl" })
		await settingsPage.savePersonalInfo()

		await expect(settingsPage.page.getByText(/invalid url/i).first()).toBeVisible()
	})

	test("persists website and LinkedIn after reload", async ({ settingsPage }) => {
		const website = "https://example.com/me"
		const linkedin = "https://www.linkedin.com/in/example"
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo({ website, linkedin })
		await settingsPage.savePersonalInfo()
		await settingsPage.expectToastSuccess(/personal information updated/i)
		await settingsPage.page.reload()

		await expect(settingsPage.websiteInput).toHaveValue(website)
		await expect(settingsPage.linkedinInput).toHaveValue(linkedin)
	})

	test("updates personal info successfully", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo({
			orcid: VALID_ORCID,
		})
		await settingsPage.savePersonalInfo()

		await settingsPage.expectToastSuccess(/personal information updated/i)
	})

	test("updates contact info successfully", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.fillContactInfo({
			address: "123 Test Street\nTest City",
			country: "Poland",
		})
		await settingsPage.saveContactInfo()

		await settingsPage.expectToastSuccess(/contact information updated/i)
	})

	test("validates empty password fields", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.submitPasswordChange()

		await expect(settingsPage.page.getByText(/current password is required/i)).toBeVisible()
	})

	test("validates short password", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.fillPasswordChange({
			currentPassword: "current",
			newPassword: "short",
			confirmPassword: "short",
		})
		await settingsPage.submitPasswordChange()

		await expect(settingsPage.page.getByText(/at least 10 characters/i)).toBeVisible()
	})

	test("validates password confirmation match", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.fillPasswordChange({
			currentPassword: "currentpass",
			newPassword: "newpassword123",
			confirmPassword: "different123",
		})
		await settingsPage.submitPasswordChange()

		await expect(settingsPage.page.getByText(/passwords do not match/i)).toBeVisible()
	})

	test("shows email verified status for verified user", async ({ settingsPage }) => {
		await settingsPage.goto()

		await expect(settingsPage.emailVerifiedBadge).toBeVisible()
		await expect(settingsPage.emailResendButton).not.toBeVisible()
	})

	test("sidebar user menu does not show email address", async ({ settingsPage }) => {
		await settingsPage.goto()

		const trigger = settingsPage.page.locator("[class*='sidebar']").getByText(TEST_EMAIL)
		await expect(trigger).not.toBeVisible()
	})

	test("shows already-verified toast for reused verification link", async ({ settingsPage }) => {
		await settingsPage.page.goto("/?verified=true&error=INVALID_TOKEN")

		await expect(
			settingsPage.page.locator("[data-sonner-toast]").getByText("Email is already verified")
		).toBeVisible({ timeout: 5000 })
	})
})

// Personal info is read from the DB (not the better-auth session), so every change
// must survive a full reload. These tests guard the DB round-trip end to end.
test.describe("Personal info persistence (DB round-trip)", () => {
	// Restore the canonical profile after each test so mutations don't leak into
	// other tests/files that rely on TEST_USER's name/affiliation.
	test.afterEach(async ({ settingsPage }) => {
		await settingsPage.goto()
		await settingsPage.fillPersonalInfo({
			firstName: TEST_USER.firstName,
			lastName: TEST_USER.lastName,
			affiliation: TEST_USER.affiliationName,
			orcid: "",
		})
		await settingsPage.savePersonalInfo()
		await settingsPage.expectToastSuccess(/personal information updated/i)
	})

	test("persists ORCID after reload", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo({ orcid: VALID_ORCID })
		await settingsPage.savePersonalInfo()
		await settingsPage.expectToastSuccess(/personal information updated/i)
		await settingsPage.goto()

		await expect(settingsPage.orcidInput).toHaveValue(VALID_ORCID)
	})

	test("persists ORCID with X checksum after reload", async ({ settingsPage }) => {
		const orcidWithX = "0000-0002-1825-009X"
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo({ orcid: orcidWithX })
		await settingsPage.savePersonalInfo()
		await settingsPage.expectToastSuccess(/personal information updated/i)
		await settingsPage.goto()

		await expect(settingsPage.orcidInput).toHaveValue(orcidWithX)
	})

	test("clears ORCID when emptied", async ({ settingsPage }) => {
		await settingsPage.goto()
		await settingsPage.fillPersonalInfo({ orcid: VALID_ORCID })
		await settingsPage.savePersonalInfo()
		await settingsPage.expectToastSuccess(/personal information updated/i)

		await settingsPage.goto()
		await settingsPage.fillPersonalInfo({ orcid: "" })
		await settingsPage.savePersonalInfo()
		await settingsPage.expectToastSuccess(/personal information updated/i)
		await settingsPage.goto()

		await expect(settingsPage.orcidInput).toHaveValue("")
	})

	test("persists title selection after reload", async ({ settingsPage }) => {
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo({ title: "MSc" })
		await settingsPage.savePersonalInfo()
		await settingsPage.expectToastSuccess(/personal information updated/i)
		await settingsPage.goto()

		await expect(settingsPage.titleSelect).toContainText("MSc")
	})

	test("persists affiliation after reload", async ({ settingsPage }) => {
		const newAffiliation = "Round-Trip Institute"
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo({ affiliation: newAffiliation })
		await settingsPage.savePersonalInfo()
		await settingsPage.expectToastSuccess(/personal information updated/i)
		await settingsPage.goto()

		await expect(settingsPage.affiliationInput).toHaveValue(newAffiliation)
	})

	test("persists all personal fields together after reload", async ({ settingsPage }) => {
		const data = {
			firstName: "Updated",
			lastName: "Person",
			title: "Dr hab.",
			affiliation: "Combined Change University",
			orcid: VALID_ORCID,
		}
		await settingsPage.goto()

		await settingsPage.fillPersonalInfo(data)
		await settingsPage.savePersonalInfo()
		await settingsPage.expectToastSuccess(/personal information updated/i)
		await settingsPage.goto()

		await expect(settingsPage.firstNameInput).toHaveValue(data.firstName)
		await expect(settingsPage.lastNameInput).toHaveValue(data.lastName)
		await expect(settingsPage.titleSelect).toContainText(data.title)
		await expect(settingsPage.affiliationInput).toHaveValue(data.affiliation)
		await expect(settingsPage.orcidInput).toHaveValue(data.orcid)
	})
})
