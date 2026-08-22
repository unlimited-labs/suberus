import { test, expect } from "../helpers/base-fixtures"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { E2E_OUTPUT_DIR } from "../../playwright.config"

const OUTPUT_DIR = resolve(process.cwd(), E2E_OUTPUT_DIR, "server")

test.describe("Nitro Tasks", () => {
	test("scheduled tasks are included in build output", async () => {
		expect(existsSync(resolve(OUTPUT_DIR, "_tasks/reminder.mjs"))).toBe(true)
		expect(existsSync(resolve(OUTPUT_DIR, "_tasks/overdue.mjs"))).toBe(true)
	})

})
