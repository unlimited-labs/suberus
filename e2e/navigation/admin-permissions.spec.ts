import { test, expect, loginAsAdmin, loginAsEditor } from "./fixtures"

// Admin vs Editor divide: editors keep Program Planner + Email campaigns but lose
// Invitations, Settings, and System Health. Guards are server-side (route
// middleware) — direct URLs redirect editors back to the admin dashboard.

test.describe("Admin vs Editor permissions", () => {
	test("editor sees Program Planner + Email campaigns, not Invitations/Settings", async ({
		page,
	}) => {
		await loginAsEditor(page)

		await expect(
			page.getByRole("link", { name: "Program Planner" }),
		).toBeVisible()
		await expect(
			page.getByRole("link", { name: "Email campaigns" }),
		).toBeVisible()
		await expect(
			page.getByRole("link", { name: "Invitations" }),
		).not.toBeVisible()
		await expect(
			page.getByRole("link", { name: "Settings" }),
		).not.toBeVisible()
	})

	test("admin sees all admin nav links", async ({ page }) => {
		await loginAsAdmin(page)

		await expect(page.getByRole("link", { name: "Invitations" })).toBeVisible()
		await expect(page.getByRole("link", { name: "Settings" })).toBeVisible()
		await expect(
			page.getByRole("link", { name: "Program Planner" }),
		).toBeVisible()
	})

	test("editor is redirected away from Invitations", async ({ page }) => {
		await loginAsEditor(page)
		await page.goto("/admin/invitations")
		await expect(page).toHaveURL(/\/admin\/dashboard/)
	})

	test("editor is redirected away from Settings", async ({ page }) => {
		await loginAsEditor(page)
		await page.goto("/admin/settings")
		await expect(page).toHaveURL(/\/admin\/dashboard/)
	})

	test("editor can open Program Planner", async ({ page }) => {
		await loginAsEditor(page)
		await page.goto("/admin/program-planner")
		await expect(page).toHaveURL(/\/admin\/program-planner/)
	})

	test("editor does not see the System Health card on the dashboard", async ({
		page,
	}) => {
		await loginAsEditor(page)
		await page.goto("/admin/dashboard")
		await expect(page.getByText("System Health", { exact: true })).toHaveCount(0)
	})

	test("admin sees the System Health card on the dashboard", async ({ page }) => {
		await loginAsAdmin(page)
		await page.goto("/admin/dashboard")
		await expect(page.getByText("System Health", { exact: true })).toBeVisible()
	})
})
