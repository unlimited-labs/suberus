import { test, expect } from "../helpers/base-fixtures"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const OUTPUT_DIR = resolve(process.cwd(), ".output/server")

test.describe("Nitro Tasks", () => {
	test("scheduled tasks are included in build output", async () => {
		// Assert - task files exist in production build
		expect(existsSync(resolve(OUTPUT_DIR, "_tasks/reminder.mjs"))).toBe(true)
		expect(existsSync(resolve(OUTPUT_DIR, "_tasks/overdue.mjs"))).toBe(true)
	})

	test("mails:reminder task runs successfully", async ({ page }) => {
		// Arrange - /_nitro/tasks/<name> is dev-only endpoint
		const response = await page.request.get("/_nitro/tasks/mails:reminder")
		test.skip(response.status() === 404, "/_nitro/tasks not available in production mode")

		// Assert
		expect(response.status()).toBe(200)
		const data = await response.json()
		expect(data.result).toBeDefined()
	})

	test("assignments:overdue task runs successfully", async ({ page }) => {
		// Arrange
		const response = await page.request.get("/_nitro/tasks/assignments:overdue")
		test.skip(response.status() === 404, "/_nitro/tasks not available in production mode")

		// Assert
		expect(response.status()).toBe(200)
		const data = await response.json()
		expect(data.result).toBeDefined()
	})
})
