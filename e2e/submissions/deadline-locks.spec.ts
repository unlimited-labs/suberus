import { test, expect } from "../helpers/base-fixtures"
import { setAppSetting } from "../helpers/test-db"
import { loginAs } from "../helpers/auth"
import { TEST_USER } from "../helpers/test-users"

// These tests modify global settings — run serially and restore after
test.describe.serial("Submission deadline & lock", () => {
	test.afterAll(async () => {
		// Restore defaults
		await setAppSetting("SUBMISSIONS_LOCKED", false)
		await setAppSetting("SUBMISSION_DEADLINE", "")
	})

	test("shows tooltip when submission deadline has passed", async ({ page }) => {
		// Set deadline to yesterday
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0]
		await setAppSetting("SUBMISSION_DEADLINE", yesterday)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		const wrapper = page.getByTestId("new-submission-disabled")
		await expect(wrapper).toBeVisible()

		// Hover wrapper to trigger tooltip
		await wrapper.hover()
		await expect(
			page.getByText("The submission deadline has passed"),
		).toBeVisible()
	})

	test("allows submissions when no deadline is set", async ({ page }) => {
		await setAppSetting("SUBMISSION_DEADLINE", "")

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		const button = page.getByRole("button", { name: "New Submission" })
		await expect(button).toBeEnabled()
	})

	test("shows tooltip when submissions are locked", async ({ page }) => {
		await setAppSetting("SUBMISSION_DEADLINE", "")
		await setAppSetting("SUBMISSIONS_LOCKED", true)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		const wrapper = page.getByTestId("new-submission-disabled")
		await expect(wrapper).toBeVisible()

		await wrapper.hover()
		await expect(
			page.getByText("Submissions have been closed by the administrator"),
		).toBeVisible()
	})

	test("lock overrides open deadline", async ({ page }) => {
		// Deadline in the future but locked
		const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0]
		await setAppSetting("SUBMISSION_DEADLINE", future)
		await setAppSetting("SUBMISSIONS_LOCKED", true)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		await expect(
			page.getByRole("button", { name: "New Submission" }),
		).toBeDisabled()
	})

	test("unlocking re-enables submissions", async ({ page }) => {
		await setAppSetting("SUBMISSIONS_LOCKED", false)
		// Deadline still in the future from previous test

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		await expect(
			page.getByRole("button", { name: "New Submission" }),
		).toBeEnabled()

		// Clean up
		await setAppSetting("SUBMISSION_DEADLINE", "")
	})
})
