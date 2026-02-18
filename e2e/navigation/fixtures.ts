import { test as base, type Page } from "@playwright/test"
import { ADMIN_USER, TEST_USER, REVIEWER_USER, EDITOR_USER } from "../helpers/test-users"
import { loginAs } from "../helpers/auth"
import { dismissViteOverlay } from "../helpers/page-setup"

export { ADMIN_USER, TEST_USER, REVIEWER_USER, EDITOR_USER }

export async function loginAsAdmin(page: Page) {
	await loginAs(page, ADMIN_USER)
}

export async function loginAsTestUser(page: Page) {
	await loginAs(page, TEST_USER)
}

export async function loginAsReviewer(page: Page) {
	await loginAs(page, REVIEWER_USER)
}

export async function loginAsEditor(page: Page) {
	await loginAs(page, EDITOR_USER)
}

export const test = base.extend({
	page: async ({ page }, use) => {
		await dismissViteOverlay(page)
		await use(page)
	},
})
export { expect } from "@playwright/test"
