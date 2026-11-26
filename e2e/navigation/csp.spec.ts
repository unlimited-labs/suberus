import type { Page } from "@playwright/test"
import {
	expect,
	loginAsAdmin,
	loginAsReviewer,
	loginAsTestUser,
	test,
} from "./fixtures"

declare global {
	interface Window {
		__cspViolations: string[]
	}
}

async function collectViolations(page: Page) {
	await page.addInitScript(() => {
		window.__cspViolations = []
		document.addEventListener("securitypolicyviolation", (e) => {
			window.__cspViolations.push(
				`${e.effectiveDirective} blocked ${e.blockedURI || "inline"} (${e.sourceFile}:${e.lineNumber})`,
			)
		})
	})
}

async function expectNoViolations(page: Page, paths: string[]) {
	const found: string[] = []
	for (const path of paths) {
		await page.goto(path)
		await page.waitForLoadState("networkidle")
		const violations = await page.evaluate(() => window.__cspViolations)
		found.push(...violations.map((v) => `${path}: ${v}`))
	}
	expect(found).toEqual([])
}

test.describe("Content Security Policy (report-only)", () => {
	test("is sent with a nonce and Permissions-Policy on pages", async ({
		page,
	}) => {
		const response = await page.goto("/login")
		const headers = response?.headers() ?? {}

		expect(headers["content-security-policy-report-only"]).toMatch(
			/script-src 'nonce-[0-9a-f]{32}' 'strict-dynamic'/,
		)
		expect(headers["permissions-policy"]).toContain("camera=()")
	})

	test("report endpoint accepts browser reports", async ({ request }) => {
		const response = await request.post("/api/csp-report", {
			headers: { "content-type": "application/csp-report" },
			data: { "csp-report": { "violated-directive": "script-src" } },
		})

		expect(response.status()).toBe(204)
	})

	test("public pages raise no violations", async ({ page }) => {
		await collectViolations(page)
		await expectNoViolations(page, ["/login", "/register", "/program"])
	})

	test("author pages raise no violations", async ({ page }) => {
		await collectViolations(page)
		await loginAsTestUser(page)
		await expectNoViolations(page, [
			"/",
			"/submissions",
			"/submissions/new",
			"/profile",
			"/fee",
		])
	})

	test("reviewer pages raise no violations", async ({ page }) => {
		await collectViolations(page)
		await loginAsReviewer(page)
		await expectNoViolations(page, ["/reviews"])
	})

	test("admin pages raise no violations", async ({ page }) => {
		await collectViolations(page)
		await loginAsAdmin(page)
		await expectNoViolations(page, [
			"/admin/dashboard",
			"/admin/submissions",
			"/admin/users",
			"/admin/settings",
			"/admin/program-planner",
			"/admin/bulk-email",
			"/admin/finances",
		])
	})
})
