import { test, expect } from "./fixtures"

test.describe("404 Not Found Page", () => {
	test("shows 404 page for unknown route", async ({ page }) => {
		await page.goto("/this-page-does-not-exist")

		await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
		await expect(page.getByRole("link", { name: "Go to Dashboard" })).toBeVisible()
	})

	test("Go to Dashboard navigates to home", async ({ page }) => {
		await page.goto("/nonexistent")

		await page.getByRole("link", { name: "Go to Dashboard" }).click()

		await expect(page).toHaveURL("/")
	})
})
