import { test, expect, TEST_USER } from "./fixtures"
import { getPrisma, setAppSetting, snapshotAppSettings } from "../helpers/test-db"
import { DEFAULT_BILLING_DETAILS } from "../../src/features/settings/billing-details-schema"

test.describe.serial("Profile - billing changes after payment", () => {
	let restoreSettings: () => Promise<void>
	let user: { id: string; billingText: string | null; needInvoice: boolean; billingChangedAfterPaymentAt: Date | null }
	let hadFee: boolean

	test.beforeAll(async () => {
		;({ restore: restoreSettings } = await snapshotAppSettings(["BILLING_DETAILS", "CONTACT_EMAIL"]))
		await setAppSetting("BILLING_DETAILS", DEFAULT_BILLING_DETAILS)
		await setAppSetting("CONTACT_EMAIL", "organizer@e2e.local")
		const db = getPrisma()
		user = await db.user.findUniqueOrThrow({
			where: { email: TEST_USER.email },
			select: { id: true, billingText: true, needInvoice: true, billingChangedAfterPaymentAt: true },
		})
		hadFee = (await db.fee.count({ where: { userId: user.id } })) > 0
		await db.fee.upsert({
			where: { userId: user.id },
			create: { userId: user.id, paid: true, paidAt: new Date() },
			update: { paid: true, paidAt: new Date() },
		})
		await db.user.update({
			where: { id: user.id },
			data: { needInvoice: true, billingText: "Old Institute", billingChangedAfterPaymentAt: null },
		})
	})

	test.afterAll(async () => {
		const db = getPrisma()
		if (!hadFee) await db.fee.deleteMany({ where: { userId: user.id } })
		await db.user.update({
			where: { id: user.id },
			data: {
				billingText: user.billingText,
				needInvoice: user.needInvoice,
				billingChangedAfterPaymentAt: user.billingChangedAfterPaymentAt,
			},
		})
		await db.activityLog.deleteMany({ where: { userId: user.id, type: "USER_BILLING_DETAILS_UPDATED" } })
		await restoreSettings()
	})

	test("a paid participant sees the organizer note and their change is flagged", async ({
		settingsPage,
		page,
	}) => {
		await settingsPage.goto()

		const note = page.getByTestId("paid-billing-note")
		await expect(note).toContainText("Your fee is paid.")
		await expect(note.getByRole("link", { name: "the conference organizer" })).toHaveAttribute(
			"href",
			"mailto:organizer@e2e.local",
		)

		await settingsPage.addressInput.fill("New Institute")
		await settingsPage.saveContactInfo()
		await settingsPage.expectToastSuccess(/contact information updated/i)

		const db = getPrisma()
		const saved = await db.user.findUniqueOrThrow({
			where: { id: user.id },
			select: { billingChangedAfterPaymentAt: true },
		})
		expect(saved.billingChangedAfterPaymentAt).not.toBeNull()
		const entry = await db.activityLog.findFirstOrThrow({
			where: { userId: user.id, type: "USER_BILLING_DETAILS_UPDATED" },
			orderBy: { createdAt: "desc" },
		})
		expect(entry.detail).toMatchObject({
			changes: { billingText: { from: "Old Institute", to: "New Institute" } },
		})
	})
})
