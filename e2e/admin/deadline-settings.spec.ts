import { test, expect } from "./fixtures"
import { setAppSetting } from "../helpers/test-db"

/**
 * Helper: click the Save button inside the Important Dates section.
 * The page has 3 Save buttons: Basic Info (#0), Important Dates (#1), Date & Time (#2).
 */
async function saveDatesSection(page: import("@playwright/test").Page) {
	await page.getByRole("button", { name: "Save" }).nth(1).click()
	await expect(page.getByText("Conference settings saved")).toBeVisible()
}

test.describe.serial("Deadline & lock settings in admin panel", () => {
	test.afterAll(async () => {
		await setAppSetting("SUBMISSIONS_LOCKED", false)
		await setAppSetting("REGISTRATION_LOCKED", false)
		await setAppSetting("SUBMISSION_DEADLINE", "")
		await setAppSetting("REGISTRATION_DEADLINE", "")
	})

	test("shows date field descriptions", async ({ adminSettingsPage, page }) => {
		await adminSettingsPage.goto()

		await expect(
			page.getByText("First day of the conference"),
		).toBeVisible()
		await expect(
			page.getByText("Last day of the conference"),
		).toBeVisible()
		await expect(
			page.getByText(
				"After this date the system automatically stops accepting new submissions",
			),
		).toBeVisible()
		await expect(
			page.getByText("Deadline for reviewers to submit their reviews"),
		).toBeVisible()
		await expect(
			page.getByText("Date when authors are notified of the decision"),
		).toBeVisible()
		await expect(
			page.getByText("After this date public registration is blocked"),
		).toBeVisible()
	})

	test("shows submission lock switch", async ({
		adminSettingsPage,
		page,
	}) => {
		await adminSettingsPage.goto()

		const lockSwitch = page.getByRole("switch", { name: "Close submissions" })
		await expect(lockSwitch).toBeVisible()
		await expect(lockSwitch).not.toBeChecked()

		await expect(
			page.getByText(
				"Immediately block all new submissions, regardless of the deadline",
			),
		).toBeVisible()
	})

	test("shows registration lock switch", async ({
		adminSettingsPage,
		page,
	}) => {
		await adminSettingsPage.goto()

		const lockSwitch = page.getByRole("switch", { name: "Close registration" })
		await expect(lockSwitch).toBeVisible()
		await expect(lockSwitch).not.toBeChecked()

		await expect(
			page.getByText(
				"Immediately block public registration, regardless of the deadline",
			),
		).toBeVisible()
	})

	test("can toggle and save submission lock", async ({
		adminSettingsPage,
		page,
	}) => {
		await adminSettingsPage.goto()

		await page.getByRole("switch", { name: "Close submissions" }).click()
		await expect(page.getByRole("switch", { name: "Close submissions" })).toBeChecked()

		await saveDatesSection(page)

		await adminSettingsPage.goto()
		await expect(page.getByRole("switch", { name: "Close submissions" })).toBeChecked()

		await setAppSetting("SUBMISSIONS_LOCKED", false)
	})

	test("can set and save registration deadline", async ({
		adminSettingsPage,
		page,
	}) => {
		await adminSettingsPage.goto()

		const input = page.getByLabel("Registration Deadline")
		await expect(input).toBeVisible()

		await input.fill("2030-12-31")
		await saveDatesSection(page)

		await adminSettingsPage.goto()
		await expect(page.getByLabel("Registration Deadline")).toHaveValue(
			"2030-12-31",
		)

		await setAppSetting("REGISTRATION_DEADLINE", "")
	})
})
