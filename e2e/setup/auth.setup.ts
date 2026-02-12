import { test as setup, expect } from "@playwright/test"
import { ADMIN_USER, TEST_USER, REVIEWER_USER, EDITOR_USER, UNVERIFIED_USER } from "../helpers/test-users"

const adminAuthFile = "e2e/.auth/admin.json"
const userAuthFile = "e2e/.auth/user.json"
const reviewerAuthFile = "e2e/.auth/reviewer.json"
const editorAuthFile = "e2e/.auth/editor.json"
const unverifiedAuthFile = "e2e/.auth/unverified.json"

setup("authenticate as admin", async ({ page }) => {
	await page.goto("/login")
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
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
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
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
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
	await page.getByLabel("E-mail").fill(REVIEWER_USER.email)
	await page.getByLabel("Password").fill(REVIEWER_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	await page.waitForURL("/", { timeout: 30000 })

	// Verify we're logged in
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })

	// Save signed-in state
	await page.context().storageState({ path: reviewerAuthFile })
})

setup("authenticate as editor", async ({ page }) => {
	await page.goto("/login")
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
	await page.getByLabel("E-mail").fill(EDITOR_USER.email)
	await page.getByLabel("Password").fill(EDITOR_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	await page.waitForURL("/", { timeout: 30000 })

	// Verify we're logged in
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })

	// Save signed-in state
	await page.context().storageState({ path: editorAuthFile })
})

setup("authenticate as unverified user", async ({ page }) => {
	await page.goto("/login")
	// SSR hydration + form render
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
	await page.getByLabel("E-mail").fill(UNVERIFIED_USER.email)
	await page.getByLabel("Password").fill(UNVERIFIED_USER.password)
	await page.getByRole("button", { name: "Sign in" }).click()
	await page.waitForURL("/", { timeout: 30000 })

	// Verify we're logged in (unverified users can still access dashboard)
	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })

	// Save signed-in state
	await page.context().storageState({ path: unverifiedAuthFile })
})
