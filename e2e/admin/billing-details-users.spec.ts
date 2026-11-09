import {
	createFee,
	createTestUser,
	deleteTestUser,
	getPrisma,
	setAppSetting,
	snapshotAppSettings,
} from "../helpers/test-db"
import { DEFAULT_BILLING_DETAILS } from "../../src/features/settings/billing-details-schema"
import { expect, test } from "./fixtures"

test.describe.serial("Users - Billing details", () => {
	let stamp: string
	let restore: () => Promise<void>
	let incomplete: { id: string; email: string }
	let requested: { id: string; email: string }
	let changed: { id: string; email: string }
	const vatId = "PL6750002236"

	test.beforeAll(async ({}, testInfo) => {
		;({ restore } = await snapshotAppSettings(["BILLING_DETAILS"]))
		await setAppSetting("BILLING_DETAILS", {
			...DEFAULT_BILLING_DETAILS,
			fields: { ...DEFAULT_BILLING_DETAILS.fields, vatId: { state: "OPTIONAL", label: "", help: "" } },
		})
		const db = getPrisma()
		stamp = `${testInfo.workerIndex}-${Date.now()}`

		incomplete = await createTestUser({
			email: `billing-incomplete-${stamp}@e2e.local`,
			firstName: "Billing",
			lastName: `Incomplete${stamp}`,
		})
		await db.user.update({ where: { id: incomplete.id }, data: { needInvoice: true } })

		requested = await createTestUser({
			email: `billing-requested-${stamp}@e2e.local`,
			firstName: "Billing",
			lastName: `Requested${stamp}`,
		})
		await db.user.update({
			where: { id: requested.id },
			data: { needInvoice: true, billingText: "Jagiellonian University\nGołębia 24", vatId },
		})
		await db.vatIdCheck.upsert({
			where: { vatId },
			create: { vatId, status: "VERIFIED", source: "VIES", registryName: "UNIWERSYTET JAGIELLOŃSKI" },
			update: { status: "VERIFIED", source: "VIES", registryName: "UNIWERSYTET JAGIELLOŃSKI", checkedAt: new Date() },
		})

		changed = await createTestUser({
			email: `billing-changed-${stamp}@e2e.local`,
			firstName: "Billing",
			lastName: `Changed${stamp}`,
		})
		const changedAt = new Date()
		await db.user.update({
			where: { id: changed.id },
			data: { needInvoice: true, billingText: "New Institute", billingChangedAfterPaymentAt: changedAt },
		})
		await createFee({ userId: changed.id, paidAt: changedAt })
		await db.activityLog.create({
			data: {
				type: "USER_BILLING_DETAILS_UPDATED",
				userId: changed.id,
				performedBy: changed.id,
				createdAt: changedAt,
				detail: {
					type: "USER_BILLING_DETAILS_UPDATED",
					changes: { billingText: { from: "Old Institute", to: "New Institute" } },
				},
			},
		})
	})

	test.afterAll(async () => {
		await deleteTestUser(incomplete.id)
		await deleteTestUser(requested.id)
		await getPrisma().activityLog.deleteMany({ where: { userId: changed.id } })
		await deleteTestUser(changed.id)
		await getPrisma().vatIdCheck.deleteMany({ where: { vatId } })
		await restore()
	})

	test("the Invoice filter narrows the list to Incomplete billing details", async ({
		adminUsersPage,
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name === "mobile-admin", "faceted filter is desktop table only")
		const rowByEmail = (email: string) =>
			page.getByTestId("user-row").filter({ visible: true, has: page.locator(`text="${email}"`) })

		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()
		await adminUsersPage.search(stamp)
		await expect(rowByEmail(requested.email)).toContainText("Requested")
		await expect(rowByEmail(incomplete.email)).toContainText("Incomplete")

		await page
			.getByRole("columnheader")
			.filter({ hasText: "Invoice" })
			.getByRole("button", { name: "Filter" })
			.click()
		await page.locator("[data-slot='popover-content']").getByRole("checkbox", { name: "Incomplete" }).click()

		await expect(rowByEmail(incomplete.email)).toBeVisible()
		await expect(rowByEmail(requested.email)).toHaveCount(0)

		await page.goto("/admin/users?invoice=INCOMPLETE")
		await adminUsersPage.waitForLoad()
		await adminUsersPage.search(stamp)
		await expect(rowByEmail(incomplete.email)).toBeVisible()
		await expect(rowByEmail(requested.email)).toHaveCount(0)
	})

	test("user detail shows the Billing details with the VAT ID registry result", async ({ page }) => {
		await page.goto(`/admin/users/${requested.id}`)

		const section = page.getByTestId("user-billing-section")
		await expect(section).toContainText("Requested")
		await expect(section).toContainText("Jagiellonian University")
		await expect(section).toContainText(vatId)
		await expect(section).toContainText("Verified")
		await expect(section).toContainText("Registry: UNIWERSYTET JAGIELLOŃSKI")
		await expect(section.getByRole("button", { name: "Re-check" })).toBeVisible()
	})

	test("Incomplete users reach a Bulk email draft through the filter and select-all", async ({
		adminUsersPage,
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name === "mobile-admin", "selection and composer are desktop-only")
		const rowByEmail = (email: string) =>
			page.getByTestId("user-row").filter({ visible: true, has: page.locator(`text="${email}"`) })

		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()
		await adminUsersPage.search(stamp)
		await page
			.getByRole("columnheader")
			.filter({ hasText: "Invoice" })
			.getByRole("button", { name: "Filter" })
			.click()
		await page.locator("[data-slot='popover-content']").getByRole("checkbox", { name: "Incomplete" }).click()
		await page.keyboard.press("Escape")
		await expect(rowByEmail(incomplete.email)).toBeVisible()
		await expect(rowByEmail(requested.email)).toHaveCount(0)

		await adminUsersPage.selectAllUsers()
		const campaignId = await adminUsersPage.openBulkEmailComposer()

		await expect(page.getByTestId("recipient-count")).toHaveText("1")
		const recipients = await getPrisma().emailCampaignRecipient.findMany({
			where: { campaignId },
			select: { userId: true },
		})
		expect(recipients).toEqual([{ userId: incomplete.id }])
	})

	test("the Changed after payment filter and badge single out a participant edit", async ({
		adminUsersPage,
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name === "mobile-admin", "faceted filter is desktop table only")
		const rowByEmail = (email: string) =>
			page.getByTestId("user-row").filter({ visible: true, has: page.locator(`text="${email}"`) })

		await adminUsersPage.goto()
		await adminUsersPage.waitForLoad()
		await adminUsersPage.search(stamp)
		await page
			.getByRole("columnheader")
			.filter({ hasText: "Invoice" })
			.getByRole("button", { name: "Filter" })
			.click()
		await page
			.locator("[data-slot='popover-content']")
			.getByRole("checkbox", { name: "Changed after payment" })
			.click()

		await expect(rowByEmail(changed.email).getByTestId("billing-changed-after-payment")).toBeVisible()
		await expect(rowByEmail(requested.email)).toHaveCount(0)
	})

	test("user detail shows the change since payment, and Acknowledge clears it", async ({ page }) => {
		await page.goto(`/admin/users/${changed.id}`)

		const alert = page.getByTestId("billing-changed-after-payment-alert")
		await expect(alert).toContainText("Changed after payment")
		await expect(alert).toContainText("Old Institute")
		await expect(alert).toContainText("New Institute")

		await alert.getByRole("button", { name: "Acknowledge" }).click()
		await expect(alert).toHaveCount(0)
		const user = await getPrisma().user.findUniqueOrThrow({
			where: { id: changed.id },
			select: { billingChangedAfterPaymentAt: true },
		})
		expect(user.billingChangedAfterPaymentAt).toBeNull()
		await expect(
			getPrisma().activityLog.count({
				where: { userId: changed.id, type: "USER_BILLING_CHANGE_ACKNOWLEDGED" },
			}),
		).resolves.toBe(1)
	})
})
