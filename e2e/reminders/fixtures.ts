import { type Locator, type Page } from "@playwright/test"
import { test as base, expect, type TestRunContext, type CleanupContext } from "../helpers/base-fixtures"

export class RemindersSettingsHelper {
	readonly page: Page

	constructor(page: Page) {
		this.page = page
	}

	async goto() {
		await this.page.goto("/admin/settings")
	}

	async switchToRemindersTab() {
		await this.page.getByRole("tab", { name: /Reminders/i }).click()
		await expect(this.page.getByRole("heading", { name: "Reviewer Reminders" })).toBeVisible()
	}

	// --- Reviewer ---
	getReviewerEnabledSwitch(): Locator {
		return this.page.locator("#reviewer-enabled")
	}

	getReviewerDaysInput(): Locator {
		return this.page.locator("#reviewer-days")
	}

	// --- Revision ---
	getRevisionEnabledSwitch(): Locator {
		return this.page.locator("#revision-enabled")
	}

	getRevisionIntervalInput(): Locator {
		return this.page.locator("#revision-interval")
	}

	getRevisionMaxCountInput(): Locator {
		return this.page.locator("#revision-max")
	}

	// --- Deadline ---
	getDeadlineEnabledSwitch(): Locator {
		return this.page.locator("#deadline-enabled")
	}

	getDeadlineDaysInput(): Locator {
		return this.page.locator("#deadline-days")
	}

	/** Click the Save button in the nth section (0-indexed) */
	async saveSection(sectionIndex: number) {
		const buttons = this.page.getByRole("button", { name: "Save" })
		await buttons.nth(sectionIndex).click()
	}
}

interface ReminderFixtures {
	testRun: TestRunContext
	cleanup: CleanupContext
	remindersSettings: RemindersSettingsHelper
}

export const test = base.extend<ReminderFixtures>({
	remindersSettings: async ({ page }, use) => {
		await use(new RemindersSettingsHelper(page))
	},
})

export { expect }
