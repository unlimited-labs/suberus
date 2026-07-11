import { test as setup, expect } from "@playwright/test"
import { E2E_WORKERS, baseUrlFor } from "../../playwright.config"
import { ADMIN_USER, TEST_USER, REVIEWER_USER, EDITOR_USER, UNVERIFIED_USER } from "../helpers/test-users"

// better-auth sessions live in the DB, so a storageState is only valid against
// the worker DB that holds the session — log every role on every worker.
const ROLES = [
	{ user: ADMIN_USER, name: "admin" },
	{ user: TEST_USER, name: "user" },
	{ user: REVIEWER_USER, name: "reviewer" },
	{ user: EDITOR_USER, name: "editor" },
	{ user: UNVERIFIED_USER, name: "unverified" },
] as const

setup("authenticate all roles on all workers", async ({ browser }) => {
	for (let i = 0; i < E2E_WORKERS; i++) {
		const baseURL = baseUrlFor(i)
		for (const { user, name } of ROLES) {
			const context = await browser.newContext({ baseURL })
			const page = await context.newPage()
			try {
				await page.goto("/login")
				// SSR hydration + form render
				await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
				await page.getByLabel("E-mail").fill(user.email)
				await page.getByLabel("Password", { exact: true }).fill(user.password)
				await page.getByRole("button", { name: "Sign in", exact: true }).click()
				await page.waitForURL("/", { timeout: 30000 })

				// Verify we're logged in
				await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 })

				// Save signed-in state for this (role, worker)
				await context.storageState({ path: `e2e/.auth/${name}-${i}.json` })
			} finally {
				await context.close()
			}
		}
	}
})
