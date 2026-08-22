import { test, expect } from "../helpers/base-fixtures"
import { getTestUserIds, setAppSetting, setUserLateSubmission } from "../helpers/test-db"
import { loginAs } from "../helpers/auth"
import { TEST_USER } from "../helpers/test-users"

// Date offset from now as a YYYY-MM-DD string (matches the format admins enter)
const dateInDays = (days: number) =>
	new Date(Date.now() + days * 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0]

// These tests modify global settings — run serially and restore after
test.describe.serial("Submission deadline & lock", () => {
	test.afterAll(async () => {
		await setAppSetting("SUBMISSIONS_LOCKED", false)
		await setAppSetting("SUBMISSION_DEADLINE", "")
	})

	test("shows tooltip when submission deadline has passed", async ({ page }) => {
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0]
		await setAppSetting("SUBMISSION_DEADLINE", yesterday)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		const wrapper = page.getByTestId("new-submission-disabled")
		await expect(wrapper).toBeVisible()

		await wrapper.hover()
		await expect(
			page.getByText("The submission deadline has passed"),
		).toBeVisible()
	})

	test("stays open on the deadline day itself", async ({ page }) => {
		// Deadline = today; submissions must remain open until the day ends
		await setAppSetting("SUBMISSION_DEADLINE", dateInDays(0))
		await setAppSetting("SUBMISSIONS_LOCKED", false)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		await expect(
			page.getByRole("button", { name: "New Submission" }),
		).toBeEnabled()
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

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		await expect(
			page.getByRole("button", { name: "New Submission" }),
		).toBeEnabled()

		await setAppSetting("SUBMISSION_DEADLINE", "")
	})

	test("hides deadline banner when no deadline is set", async ({ page }) => {
		await setAppSetting("SUBMISSION_DEADLINE", "")
		await setAppSetting("SUBMISSIONS_LOCKED", false)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		await expect(page.getByTestId("submission-deadline")).toHaveCount(0)
	})

	test("shows deadline banner with the date, neutral when far away", async ({
		page,
	}) => {
		await setAppSetting("SUBMISSION_DEADLINE", dateInDays(30))
		await setAppSetting("SUBMISSIONS_LOCKED", false)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		await expect(page.getByTestId("submission-deadline")).toBeVisible()
		const date = page.getByTestId("submission-deadline-date")
		// Renders a formatted date (every format includes a 4-digit year)
		await expect(date).toHaveText(/\d{4}/)
		await expect(date).not.toHaveClass(/text-red-700/)
		await expect(date).not.toHaveClass(/font-bold/)
	})

	test("colors deadline red within a week (not bold)", async ({ page }) => {
		await setAppSetting("SUBMISSION_DEADLINE", dateInDays(5))
		await setAppSetting("SUBMISSIONS_LOCKED", false)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		const date = page.getByTestId("submission-deadline-date")
		await expect(date).toBeVisible()
		await expect(date).toHaveClass(/text-red-700/)
		await expect(date).not.toHaveClass(/font-bold/)
	})

	test("bolds deadline within three days", async ({ page }) => {
		await setAppSetting("SUBMISSION_DEADLINE", dateInDays(2))
		await setAppSetting("SUBMISSIONS_LOCKED", false)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		const date = page.getByTestId("submission-deadline-date")
		await expect(date).toBeVisible()
		await expect(date).toHaveClass(/text-red-700/)
		await expect(date).toHaveClass(/font-bold/)

		await setAppSetting("SUBMISSION_DEADLINE", "")
	})
})

// Per-user "Allow late submission" override bypasses both deadline and lock
test.describe.serial("Late submission override", () => {
	test.afterAll(async () => {
		const { testUserId } = await getTestUserIds()
		await setUserLateSubmission(testUserId, false)
		await setAppSetting("SUBMISSIONS_LOCKED", false)
		await setAppSetting("SUBMISSION_DEADLINE", "")
	})

	test("override lets user submit past deadline and while locked", async ({
		page,
	}) => {
		const { testUserId } = await getTestUserIds()
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0]
		await setAppSetting("SUBMISSION_DEADLINE", yesterday)
		await setAppSetting("SUBMISSIONS_LOCKED", true)
		await setUserLateSubmission(testUserId, true)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		await expect(
			page.getByRole("button", { name: "New Submission" }),
		).toBeEnabled()
	})

	test("disabling the override blocks the user again", async ({ page }) => {
		const { testUserId } = await getTestUserIds()
		// Deadline + lock still active from previous test
		await setUserLateSubmission(testUserId, false)

		await loginAs(page, TEST_USER)
		await page.goto("/submissions")

		await expect(page.getByTestId("new-submission-disabled")).toBeVisible()
	})
})
