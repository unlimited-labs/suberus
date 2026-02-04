import {
	test,
	expect,
	loginAsAdmin,
	loginAsTestUser,
	loginAsReviewer,
	loginAsEditor,
} from "./fixtures"

test.describe("Reviews link visibility", () => {
	test("author should not see Reviews link", async ({ page }) => {
		// Arrange & Act
		await loginAsTestUser(page)

		// Assert - Reviews link should not be visible in sidebar
		await expect(page.getByRole("link", { name: "Reviews" })).not.toBeVisible()
	})

	test("reviewer should see Reviews link", async ({ page }) => {
		// Arrange & Act
		await loginAsReviewer(page)

		// Assert - Reviews link should be visible in sidebar
		await expect(page.getByRole("link", { name: "Reviews" })).toBeVisible()
	})

	test("admin should see Reviews link", async ({ page }) => {
		// Arrange & Act
		await loginAsAdmin(page)

		// Assert - Reviews link should be visible in sidebar
		await expect(page.getByRole("link", { name: "Reviews" })).toBeVisible()
	})

	test("editor should see Reviews link", async ({ page }) => {
		// Arrange & Act
		await loginAsEditor(page)

		// Assert - Reviews link should be visible in sidebar
		await expect(page.getByRole("link", { name: "Reviews" })).toBeVisible()
	})
})
