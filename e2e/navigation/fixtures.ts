import { test as base, type Page } from "@playwright/test"

export const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
}

export const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
}

export const REVIEWER_USER = {
	email: "reviewer@e2e.local",
	password: "testpass123",
}

export const EDITOR_USER = {
	email: "editor@e2e.local",
	password: "testpass123",
}

export async function loginAsAdmin(page: Page) {
	await page.goto("/login")
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
	await page.getByLabel("E-mail").fill(ADMIN_USER.email)
	await page.getByLabel("Password").fill(ADMIN_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	// API auth + session + redirect
	await page.waitForURL("/", { timeout: 30000 })
}

export async function loginAsTestUser(page: Page) {
	await page.goto("/login")
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
	await page.getByLabel("E-mail").fill(TEST_USER.email)
	await page.getByLabel("Password").fill(TEST_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	// API auth + session + redirect
	await page.waitForURL("/", { timeout: 30000 })
}

export async function loginAsReviewer(page: Page) {
	await page.goto("/login")
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
	await page.getByLabel("E-mail").fill(REVIEWER_USER.email)
	await page.getByLabel("Password").fill(REVIEWER_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	// API auth + session + redirect
	await page.waitForURL("/", { timeout: 30000 })
}

export async function loginAsEditor(page: Page) {
	await page.goto("/login")
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
	await page.getByLabel("E-mail").fill(EDITOR_USER.email)
	await page.getByLabel("Password").fill(EDITOR_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	// API auth + session + redirect
	await page.waitForURL("/", { timeout: 30000 })
}

export const test = base
export { expect } from "@playwright/test"
