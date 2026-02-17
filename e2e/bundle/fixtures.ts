import { test as base, type Page } from "@playwright/test"
import { ADMIN_USER, TEST_USER } from "../helpers/test-users"
import { loginAs } from "../helpers/auth"

export { ADMIN_USER, TEST_USER }

export async function loginAsAdmin(page: Page) {
	await loginAs(page, ADMIN_USER)
}

export async function loginAsTestUser(page: Page) {
	await loginAs(page, TEST_USER)
}

export const test = base
export { expect } from "@playwright/test"
