import { test as setup, expect } from "@playwright/test"

const ADMIN_USER = {
	email: "admin@e2e.local",
	password: "testpass123",
}

const TEST_USER = {
	email: "test@e2e.local",
	password: "testpass123",
}

const REVIEWER_USER = {
	email: "reviewer@e2e.local",
	password: "testpass123",
}

const adminAuthFile = "e2e/.auth/admin.json"
const userAuthFile = "e2e/.auth/user.json"
const reviewerAuthFile = "e2e/.auth/reviewer.json"

setup("authenticate as admin", async ({ page }) => {
	await page.goto("/login")
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 60000 })
	await page.getByLabel("E-mail").fill(ADMIN_USER.email)
	await page.getByLabel("Password").fill(ADMIN_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	await page.waitForURL("/", { timeout: 30000 })

	// Verify we're logged in
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })

	// Save signed-in state
	await page.context().storageState({ path: adminAuthFile })
})

setup("authenticate as user", async ({ page }) => {
	await page.goto("/login")
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 60000 })
	await page.getByLabel("E-mail").fill(TEST_USER.email)
	await page.getByLabel("Password").fill(TEST_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	await page.waitForURL("/", { timeout: 30000 })

	// Verify we're logged in
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })

	// Save signed-in state
	await page.context().storageState({ path: userAuthFile })
})

setup("authenticate as reviewer", async ({ page }) => {
	await page.goto("/login")
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 60000 })
	await page.getByLabel("E-mail").fill(REVIEWER_USER.email)
	await page.getByLabel("Password").fill(REVIEWER_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	await page.waitForURL("/", { timeout: 30000 })

	// Verify we're logged in
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })

	// Save signed-in state
	await page.context().storageState({ path: reviewerAuthFile })
})
