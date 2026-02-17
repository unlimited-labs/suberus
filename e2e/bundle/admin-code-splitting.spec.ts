import { test, expect, loginAsTestUser, loginAsAdmin } from "./fixtures"

const ADMIN_CHUNK_PATTERNS = [/_layout-/, /use-admin-auth-/]

function isAdminChunk(url: string): boolean {
	const filename = url.split("/").pop() ?? ""
	return ADMIN_CHUNK_PATTERNS.some((pattern) => pattern.test(filename))
}

test.describe("Admin code splitting", () => {
	test("author does not download admin chunks", async ({ page }) => {
		// Arrange
		const jsRequests: string[] = []
		page.on("response", (response) => {
			const url = response.url()
			if (url.includes("/assets/") && url.endsWith(".js")) {
				jsRequests.push(url)
			}
		})

		// Act
		await loginAsTestUser(page)
		await page.goto("/submissions")
		await page.waitForLoadState("networkidle")
		await page.goto("/profile")
		await page.waitForLoadState("networkidle")

		// Assert
		expect(jsRequests.length).toBeGreaterThan(0)
		const adminChunks = jsRequests.filter(isAdminChunk)
		expect(adminChunks, "Author should not load admin chunks").toHaveLength(0)
		await expect(
			page.getByRole("heading", { name: "Administration" }),
		).not.toBeVisible()
	})

	test("admin loads admin chunks on admin navigation", async ({ page }) => {
		// Arrange
		const jsRequests: string[] = []
		page.on("response", (response) => {
			const url = response.url()
			if (url.includes("/assets/") && url.endsWith(".js")) {
				jsRequests.push(url)
			}
		})

		// Act
		await loginAsAdmin(page)
		await page.goto("/admin/dashboard")
		await page.waitForLoadState("networkidle")

		// Assert
		const adminChunks = jsRequests.filter(isAdminChunk)
		expect(
			adminChunks.length,
			"Admin should load admin layout chunk",
		).toBeGreaterThan(0)
	})
})
