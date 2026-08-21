import { test, expect } from "./fixtures";
import { setAppSetting } from "../helpers/test-db";

// Tests mutate a shared setting — run serially
test.describe.configure({ mode: "serial" })

test.describe("Admin Settings - Invitations", () => {
	test.beforeAll(async () => {
		await setAppSetting("INVITATION_VALIDITY_HOURS", 72)
	})

	test.afterAll(async () => {
		await setAppSetting("INVITATION_VALIDITY_HOURS", 72)
	})

	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		await adminSettingsPage.goto()
		await adminSettingsPage.switchToInvitationsTab(testInfo)
	})

	test("admin saves a new validity and it persists", async ({
		adminSettingsPage,
		page,
	}) => {
		// Act
		await adminSettingsPage.getInvitationValidityInput().fill("120")
		await page.getByRole("button", { name: "Save" }).click()

		// Assert
		await expect(page.getByText("Invitation settings saved")).toBeVisible()

		await page.reload()
		await adminSettingsPage.switchToInvitationsTab()
		await expect(adminSettingsPage.getInvitationValidityInput()).toHaveValue(
			"120",
		)
	})

	test("rejects a validity below one hour", async ({
		adminSettingsPage,
		page,
	}) => {
		// Act
		await adminSettingsPage.getInvitationValidityInput().fill("0")
		await page.getByRole("button", { name: "Save" }).click()

		// Assert — blocked on the client, nothing saved
		await expect(page.getByText("Must be at least 1 hour")).toBeVisible()
		await expect(page.getByText("Invitation settings saved")).toBeHidden()
	})
})
