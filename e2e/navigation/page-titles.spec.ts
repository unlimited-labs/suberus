import { expect, loginAsTestUser, test } from "./fixtures"

test.describe("Document titles", () => {
	test("auth pages name the page", async ({ page }) => {
		await page.goto("/login")
		await expect(page).toHaveTitle(/^Sign in \| /)

		await page.goto("/register")
		await expect(page).toHaveTitle(/^Registration \| /)
	})

	test("app pages keep the title in sync on client-side navigation", async ({
		page,
	}) => {
		await loginAsTestUser(page)
		await expect(page).toHaveTitle(/^Dashboard \| /)

		await page.getByRole("link", { name: "Profile" }).first().click()
		await expect(page).toHaveURL(/\/profile/)
		await expect(page).toHaveTitle(/^Profile \| /)
	})
})
