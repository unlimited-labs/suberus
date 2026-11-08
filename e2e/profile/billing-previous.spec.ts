import { test, expect, TEST_USER } from "./fixtures"
import { getPrisma, setAppSetting, snapshotAppSettings } from "../helpers/test-db"
import { DEFAULT_BILLING_DETAILS } from "../../src/features/settings/billing-details-schema"

function readBilling() {
	return getPrisma().user.findUniqueOrThrow({
		where: { email: TEST_USER.email },
		select: {
			needInvoice: true,
			billingText: true,
			billingOrganization: true,
			billingStreet: true,
			billingPostalCode: true,
			billingCity: true,
			vatId: true,
			country: true,
		},
	})
}

test.describe.serial("Profile - billing details from the previous form", () => {
	let restoreSettings: () => Promise<void>
	let saved: Awaited<ReturnType<typeof readBilling>>

	test.beforeAll(async () => {
		;({ restore: restoreSettings } = await snapshotAppSettings(["BILLING_DETAILS"]))
		saved = await readBilling()
	})

	test.afterAll(async () => {
		await getPrisma().user.update({
			where: { email: TEST_USER.email },
			data: saved,
		})
		await restoreSettings()
	})

	test("Separate fields show the old text as a read-only card above the empty fields", async ({
		settingsPage,
		page,
	}) => {
		await setAppSetting("BILLING_DETAILS", {
			...DEFAULT_BILLING_DETAILS,
			mode: "STRUCTURED",
			fields: {
				...DEFAULT_BILLING_DETAILS.fields,
				organizationName: { state: "REQUIRED", label: "", help: "" },
			},
		})
		await getPrisma().user.update({
			where: { email: TEST_USER.email },
			data: {
				needInvoice: true,
				billingText: "ACME Institute\n1 Main St",
				billingOrganization: null,
				billingStreet: null,
				billingPostalCode: null,
				billingCity: null,
			},
		})

		await settingsPage.goto()

		const card = page.getByTestId("previous-billing-card")
		await expect(card).toContainText("Your previous billing details")
		await expect(card).toContainText("ACME Institute")
		await expect(page.getByLabel("Organization name *")).toHaveValue("")

		await page.getByLabel("Organization name *").fill("ACME Institute")
		await settingsPage.saveContactInfo()
		await expect(page.getByText("Contact information updated successfully")).toBeVisible()
		await expect(card).toHaveCount(0)
	})
})
