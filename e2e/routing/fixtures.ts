import { test as base, expect } from "../helpers/base-fixtures"
import { dismissViteOverlay } from "../helpers/page-setup"

export const test = base.extend({
	page: async ({ page }, use) => {
		await dismissViteOverlay(page)
		await use(page)
	},
})

export { expect }
