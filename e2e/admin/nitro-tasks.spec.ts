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

})
