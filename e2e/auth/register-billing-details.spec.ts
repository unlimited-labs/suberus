import { test, expect } from "./fixtures"
import { getPrisma, setAppSetting, snapshotAppSettings } from "../helpers/test-db"
import { DEFAULT_BILLING_DETAILS } from "../../src/features/settings/billing-details-schema"

const STEP1 = {
	password: "ValidPassword123!",
	confirmPassword: "ValidPassword123!",
	firstName: "Bill",
	lastName: "Payer",
	affiliation: "Test University",
}

test.describe.serial("Registration - Billing details", () => {
	let restore: () => Promise<void>

	test.beforeAll(async () => {
		;({ restore } = await snapshotAppSettings(["BILLING_DETAILS"]))
	})

	test.afterAll(async () => {
		await restore()
	})

	test("Invoice required off: the invoice checkbox starts unchecked and details stay optional", async ({
		registerPage,
	}) => {
		await setAppSetting("BILLING_DETAILS", DEFAULT_BILLING_DETAILS)
		await registerPage.goto()
		await registerPage.fillStep1({ email: "billing-off@example.com", ...STEP1 })
		await registerPage.clickContinue()
		await registerPage.waitForStep2()

		const invoice = registerPage.page.getByRole("checkbox", { name: "I need an invoice for my organization" })
		await expect(invoice).not.toBeChecked()
		await expect(registerPage.page.getByLabel(/Billing details/)).toHaveCount(0)

		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
		await expect(registerPage.page.getByRole("checkbox", { name: /I agree to the/ })).toBeVisible()
	})

	test("Invoice required on: no checkbox, custom label and help, details mandatory and stored", async ({
		registerPage,
		testRun,
	}) => {
		test.setTimeout(120_000)
		await setAppSetting("BILLING_DETAILS", {
			...DEFAULT_BILLING_DETAILS,
			invoiceRequired: true,
			text: { label: "Invoice data", help: "Institution name and full postal address." },
		})
		const email = `billing-on-${testRun.testRunId}@e2e.local`
		const page = registerPage.page

		await registerPage.goto()
		await registerPage.fillStep1({ email, ...STEP1 })
		await registerPage.clickContinue()
		await registerPage.waitForStep2()

		await expect(page.getByRole("checkbox", { name: "I need an invoice for my organization" })).toHaveCount(0)
		await expect(page.getByText("Institution name and full postal address.")).toBeVisible()

		await registerPage.clickContinue()
		await expect(page.getByText("Billing details are required")).toBeVisible()

		await page.getByLabel("Invoice data *").fill("ACME Institute\n1 Main St")
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()
		await expect(page).toHaveURL("/", { timeout: 15000 })

		const user = await getPrisma().user.findUnique({
			where: { email },
			select: { needInvoice: true, billingText: true },
		})
		expect(user).toEqual({ needInvoice: true, billingText: "ACME Institute\n1 Main St" })
	})

	const structured = (invoiceRequired: boolean) => ({
		...DEFAULT_BILLING_DETAILS,
		invoiceRequired,
		mode: "STRUCTURED",
		fields: {
			...DEFAULT_BILLING_DETAILS.fields,
			organizationName: { state: "REQUIRED", label: "", help: "" },
			streetAddress: { state: "OPTIONAL", label: "", help: "" },
			postalCode: { state: "REQUIRED", label: "", help: "" },
			city: { state: "REQUIRED", label: "", help: "Town or city of the institution." },
		},
	})

	test("Separate fields, Invoice required off: fields appear on request, organization prefilled from affiliation", async ({
		registerPage,
		testRun,
	}) => {
		test.setTimeout(120_000)
		await setAppSetting("BILLING_DETAILS", structured(false))
		const email = `billing-fields-off-${testRun.testRunId}@e2e.local`
		const page = registerPage.page

		await registerPage.goto()
		await registerPage.fillStep1({ email, ...STEP1 })
		await registerPage.clickContinue()
		await registerPage.waitForStep2()

		await expect(page.getByLabel("Organization name *")).toHaveCount(0)
		await page.getByRole("checkbox", { name: "I need an invoice for my organization" }).check()
		await expect(page.getByLabel("Organization name *")).toHaveValue("Test University")
		await expect(page.getByLabel("Street address", { exact: true })).toBeVisible()
		await expect(page.getByText("Town or city of the institution.")).toBeVisible()

		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
		await expect(page.getByText("This field is required")).toHaveCount(2)

		await page.getByLabel("Postal code *").fill("30-059")
		await page.getByLabel("City *").fill("Krakow")
		await expect(page.getByTestId("buyer-summary-card")).toContainText("30-059 Krakow")
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()
		await expect(page).toHaveURL("/", { timeout: 15000 })

		const user = await getPrisma().user.findUnique({
			where: { email },
			select: {
				needInvoice: true,
				billingOrganization: true,
				billingStreet: true,
				billingPostalCode: true,
				billingCity: true,
			},
		})
		expect(user).toEqual({
			needInvoice: true,
			billingOrganization: "Test University",
			billingStreet: null,
			billingPostalCode: "30-059",
			billingCity: "Krakow",
		})
	})

	test("Separate fields, Invoice required on: no checkbox and REQUIRED fields block step 2", async ({
		registerPage,
	}) => {
		await setAppSetting("BILLING_DETAILS", structured(true))
		const page = registerPage.page

		await registerPage.goto()
		await registerPage.fillStep1({ email: "billing-fields-on@example.com", ...STEP1 })
		await registerPage.clickContinue()
		await registerPage.waitForStep2()

		await expect(page.getByRole("checkbox", { name: "I need an invoice for my organization" })).toHaveCount(0)
		await page.getByLabel("Organization name *").fill("")
		await registerPage.fillStep2({ country: "Poland" })
		await registerPage.clickContinue()
		await expect(page.getByText("This field is required")).toHaveCount(3)

		await page.getByLabel("Organization name *").fill("ACME Institute")
		await page.getByLabel("Postal code *").fill("30-059")
		await page.getByLabel("City *").fill("Krakow")
		await registerPage.clickContinue()
		await expect(page.getByRole("checkbox", { name: /I agree to the/ })).toBeVisible()
	})

	test("VAT ID beside the Simple text box: prefix from Country, bad checksum blocks, stored normalized", async ({
		registerPage,
		testRun,
	}) => {
		test.setTimeout(120_000)
		await setAppSetting("BILLING_DETAILS", {
			...DEFAULT_BILLING_DETAILS,
			invoiceRequired: true,
			fields: {
				...DEFAULT_BILLING_DETAILS.fields,
				vatId: { state: "OPTIONAL", label: "", help: "With the country prefix, e.g. PL…" },
			},
		})
		const email = `billing-vat-${testRun.testRunId}@e2e.local`
		const page = registerPage.page

		await registerPage.goto()
		await registerPage.fillStep1({ email, ...STEP1 })
		await registerPage.clickContinue()
		await registerPage.waitForStep2()
		await page.getByLabel("Billing details (organization) *").fill("ACME Institute")

		const vat = page.getByLabel("VAT ID", { exact: true })
		await vat.fill("1234567890")
		await registerPage.fillStep2({ country: "Poland" })
		await expect(page.getByText("Not a valid PL VAT ID")).toBeVisible()

		await vat.fill("PL 675-000-22-37")
		await registerPage.clickContinue()
		await expect(page.getByText("Not a valid PL VAT ID")).toBeVisible()

		await vat.fill("675-000-22-36")
		await vat.blur()
		await expect(vat).toHaveValue("PL6750002236")
		await registerPage.clickContinue()
		await registerPage.fillStep3({ acceptTerms: true })
		await registerPage.clickCreateAccount()
		await expect(page).toHaveURL("/", { timeout: 15000 })

		const storedVatId = async () =>
			(await getPrisma().user.findUnique({ where: { email }, select: { vatId: true } }))?.vatId
		expect(await storedVatId()).toBe("PL6750002236")

		await page.goto("/profile")
		await expect(page.getByLabel("VAT ID", { exact: true })).toHaveValue("PL6750002236")
		await page
			.locator("section")
			.filter({ hasText: "Contact & Invoice Information" })
			.getByRole("button", { name: "Save changes" })
			.click()
		await expect(page.getByText("Contact information updated successfully")).toBeVisible()
		expect(await storedVatId()).toBe("PL6750002236")
	})
})
