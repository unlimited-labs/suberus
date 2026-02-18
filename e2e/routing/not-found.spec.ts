import { test, expect } from "./fixtures"

test.describe("404 Not Found Page", () => {
	test("shows 404 page for unknown route", async ({ page }) => {
		// Arrange & Act
		await page.goto("/this-page-does-not-exist")

		// Assert
		await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
		await expect(page.getByRole("link", { name: "Go to Dashboard" })).toBeVisible()
	})

	test("Go to Dashboard navigates to home", async ({ page }) => {
		// Arrange
		await page.goto("/nonexistent")

		// Act
		await page.getByRole("link", { name: "Go to Dashboard" }).click()

		// Assert
		await expect(page).toHaveURL("/")
	})
})
