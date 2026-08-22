import { test, expect, loginAsTestUser, loginAsAdmin } from "./fixtures"

const ADMIN_CHUNK_PATTERNS = [/_layout-/, /use-admin-auth-/]

function isAdminChunk(url: string): boolean {
	const filename = url.split("/").pop() ?? ""
	return ADMIN_CHUNK_PATTERNS.some((pattern) => pattern.test(filename))
}

function isProductionJs(url: string): boolean {
	return url.includes("/assets/") && url.endsWith(".js")
}

test.describe("Admin code splitting", () => {
	test("author does not download admin chunks", async ({ page }) => {
		const prodJsRequests: string[] = []
		page.on("response", (response) => {
			const url = response.url()
			if (isProductionJs(url)) {
				prodJsRequests.push(url)
			}
		})

		await loginAsTestUser(page)
		await page.goto("/submissions")
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
		await page.goto("/profile")
		await expect(page.getByRole("heading", { name: "Profile", level: 1 })).toBeVisible()

		const isProduction = prodJsRequests.length > 0

		if (isProduction) {
			const adminChunks = prodJsRequests.filter(isAdminChunk)
			expect(adminChunks, "Author should not load admin chunks").toHaveLength(0)
		}
		// Dev mode: Vite serves all route modules eagerly (TanStack Router prefetching),
		// so module-level code splitting can only be verified in production builds.

		await expect(
			page.getByRole("heading", { name: "Administration" }),
		).not.toBeVisible()
	})

	test("admin loads admin chunks on admin navigation", async ({ page }) => {
		const prodJsRequests: string[] = []
		page.on("response", (response) => {
			const url = response.url()
			if (isProductionJs(url)) {
				prodJsRequests.push(url)
			}
		})

		await loginAsAdmin(page)
		await page.goto("/admin/dashboard")
		await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible()

		const isProduction = prodJsRequests.length > 0

		if (isProduction) {
			await expect.poll(
				() => prodJsRequests.filter(isAdminChunk).length,
				{ message: "Admin should load admin layout chunk", timeout: 10000 },
			).toBeGreaterThan(0)
		}
		// Dev mode: all modules are loaded — admin route presence is trivially true
	})
})
