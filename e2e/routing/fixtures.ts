import { test as base, expect } from "@playwright/test"
import { dismissViteOverlay } from "../helpers/page-setup"

export const test = base.extend({
	page: async ({ page }, use) => {
		await dismissViteOverlay(page)
		await use(page)
	},
})

export { expect }
