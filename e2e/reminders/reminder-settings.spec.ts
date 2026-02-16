import { test, expect } from "./fixtures"
import { setAppSetting } from "../helpers/test-db"

// Tests modify shared settings — run serially
test.describe.configure({ mode: "serial" })

test.describe("Admin Settings - Reminders", () => {
	test.beforeAll(async () => {
		// Reset to known state before all tests
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: false, daysBefore: [3, 1] })
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: false, intervalDays: 7, maxCount: 3 })
		await setAppSetting("REMINDER_DEADLINE_SETTINGS", { enabled: false, daysBefore: [7, 3, 1] })
	})

	test.afterAll(async () => {
		// Reset reminder settings to defaults
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: false, daysBefore: [3, 1] })
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: false, intervalDays: 7, maxCount: 3 })
		await setAppSetting("REMINDER_DEADLINE_SETTINGS", { enabled: false, daysBefore: [7, 3, 1] })
	})

	test("displays reminders tab with three sections", async ({ remindersSettings, page }) => {
		// Arrange
		await remindersSettings.goto()

		// Act
		await remindersSettings.switchToRemindersTab()

		// Assert
		await expect(page.getByLabel("Reviewer reminders")).toBeVisible()
		await expect(page.getByLabel("Revision reminders")).toBeVisible()
		await expect(page.getByLabel("Deadline reminders")).toBeVisible()
	})

	test("disables inputs when toggle is off", async ({ remindersSettings }) => {
		// Arrange
		await remindersSettings.goto()
		await remindersSettings.switchToRemindersTab()

		// Assert - reviewer inputs disabled
		await expect(remindersSettings.getReviewerEnabledSwitch()).not.toBeChecked()
		await expect(remindersSettings.getReviewerDaysInput()).toBeDisabled()

		// Assert - revision inputs disabled
		await expect(remindersSettings.getRevisionEnabledSwitch()).not.toBeChecked()
		await expect(remindersSettings.getRevisionIntervalInput()).toBeDisabled()
		await expect(remindersSettings.getRevisionMaxCountInput()).toBeDisabled()

		// Assert - deadline inputs disabled
		await expect(remindersSettings.getDeadlineEnabledSwitch()).not.toBeChecked()
		await expect(remindersSettings.getDeadlineDaysInput()).toBeDisabled()
	})

	test("can toggle reviewer reminders and save", async ({ remindersSettings, page }) => {
		// Arrange
		await remindersSettings.goto()
		await remindersSettings.switchToRemindersTab()

		// Act
		await remindersSettings.getReviewerEnabledSwitch().click()
		await remindersSettings.getReviewerDaysInput().clear()
		await remindersSettings.getReviewerDaysInput().fill("7, 3, 1")
		await remindersSettings.save()

		// Assert
		await expect(page.getByText("Reminder settings saved")).toBeVisible({ timeout: 5000 })

		// Verify persistence after reload
		await page.reload()
		await remindersSettings.switchToRemindersTab()
		await expect(remindersSettings.getReviewerEnabledSwitch()).toBeChecked()
		await expect(remindersSettings.getReviewerDaysInput()).toHaveValue("7, 3, 1")
	})

	test("can configure revision reminders", async ({ remindersSettings, page }) => {
		// Arrange
		await remindersSettings.goto()
		await remindersSettings.switchToRemindersTab()

		// Act
		await remindersSettings.getRevisionEnabledSwitch().click()
		await remindersSettings.getRevisionIntervalInput().clear()
		await remindersSettings.getRevisionIntervalInput().fill("5")
		await remindersSettings.getRevisionMaxCountInput().clear()
		await remindersSettings.getRevisionMaxCountInput().fill("2")
		await remindersSettings.save()

		// Assert
		await expect(page.getByText("Reminder settings saved")).toBeVisible({ timeout: 5000 })

		// Verify persistence
		await page.reload()
		await remindersSettings.switchToRemindersTab()
		await expect(remindersSettings.getRevisionEnabledSwitch()).toBeChecked()
		await expect(remindersSettings.getRevisionIntervalInput()).toHaveValue("5")
		await expect(remindersSettings.getRevisionMaxCountInput()).toHaveValue("2")
	})

	test("can configure deadline reminders", async ({ remindersSettings, page }) => {
		// Arrange
		await remindersSettings.goto()
		await remindersSettings.switchToRemindersTab()

		// Act
		await remindersSettings.getDeadlineEnabledSwitch().click()
		await remindersSettings.getDeadlineDaysInput().clear()
		await remindersSettings.getDeadlineDaysInput().fill("14, 7, 3")
		await remindersSettings.save()

		// Assert
		await expect(page.getByText("Reminder settings saved")).toBeVisible({ timeout: 5000 })

		// Verify persistence
		await page.reload()
		await remindersSettings.switchToRemindersTab()
		await expect(remindersSettings.getDeadlineEnabledSwitch()).toBeChecked()
		await expect(remindersSettings.getDeadlineDaysInput()).toHaveValue("14, 7, 3")
	})
})
