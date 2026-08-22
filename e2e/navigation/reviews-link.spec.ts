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
		await loginAsTestUser(page)

		await expect(page.getByRole("link", { name: "Reviews" })).not.toBeVisible()
	})

	test("reviewer should see Reviews link", async ({ page }) => {
		await loginAsReviewer(page)

		await expect(page.getByRole("link", { name: "Reviews" })).toBeVisible()
	})

	test("admin should see Reviews link", async ({ page }) => {
		await loginAsAdmin(page)

		await expect(page.getByRole("link", { name: "Reviews" })).toBeVisible()
	})

	test("editor should see Reviews link", async ({ page }) => {
		await loginAsEditor(page)

		await expect(page.getByRole("link", { name: "Reviews" })).toBeVisible()
	})
})
