import { test, expect } from "../helpers/base-fixtures"
import { getPrisma, setAppSetting, snapshotAppSettings } from "../helpers/test-db"
import { DEFAULT_BILLING_DETAILS } from "../../src/features/settings/billing-details-schema"

test.describe.serial("Settings - Billing details", () => {
	let restore: () => Promise<void>

	test.beforeAll(async () => {
		;({ restore } = await snapshotAppSettings(["BILLING_DETAILS"]))
		await setAppSetting("BILLING_DETAILS", DEFAULT_BILLING_DETAILS)
	})

	test.afterAll(async () => {
		await restore()
	})

	test("saves Invoice required and the text box label, with a live preview", async ({ page }) => {
		await page.goto("/admin/settings?tab=survey")
		await expect(page.getByTestId("settings-tab-survey")).toContainText("Registration form")

		const preview = page.getByTestId("billing-details-preview")
		const showPreview = async () => {
			const previewPane = page.getByRole("radio", { name: "Preview" })
			if (await previewPane.isVisible()) await previewPane.click()
		}
		const showConfigure = async () => {
			const configurePane = page.getByRole("radio", { name: "Configure" })
			if (await configurePane.isVisible()) await configurePane.click()
		}

		await showPreview()
		await expect(preview.getByRole("checkbox", { name: "I need an invoice for my organization" })).toBeVisible()

		await showConfigure()
		await page.getByTestId("billing-invoice-required").click()
		await page.getByRole("button", { name: /Text box/ }).click()
		await page.getByLabel("Label", { exact: true }).fill("Invoice data")

		await showPreview()
		await expect(preview.getByRole("checkbox", { name: "I need an invoice for my organization" })).toHaveCount(0)
		await expect(preview.getByLabel("Invoice data *")).toBeVisible()

		await showConfigure()
		await page.getByRole("button", { name: "Save", exact: true }).click()
		await expect(page.getByText("Billing details saved")).toBeVisible()

		const saved = await getPrisma().appSetting.findUnique({ where: { key: "BILLING_DETAILS" } })
		expect(saved?.value).toMatchObject({
			invoiceRequired: true,
			mode: "FREE_TEXT",
			text: { label: "Invoice data", help: "" },
		})

		await page.reload()
		await expect(page.getByTestId("billing-invoice-required")).toBeChecked()
	})
})
