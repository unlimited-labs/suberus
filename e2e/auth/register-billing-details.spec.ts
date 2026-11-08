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

test.describe.serial("Registration - Billing details (Simple mode)", () => {
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
})
