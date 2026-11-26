import type { Locator, Page } from "@playwright/test"
import { expect, test } from "./fixtures"

const LANDSCAPE_PHONE = { width: 667, height: 320 }
const ZOOM_200 = { width: 640, height: 400 }

// Wheel like a user: scrollIntoViewIfNeeded would also scroll the overflow:hidden <body>.
async function wheelUntilInViewport(page: Page, target: Locator) {
	const size = page.viewportSize()
	await page.mouse.move((size?.width ?? 0) / 2, (size?.height ?? 0) / 2)
	await expect(async () => {
		await page.mouse.wheel(0, 120)
		await expect(target).toBeInViewport({ timeout: 250 })
	}).toPass({ timeout: 10_000 })
}

test.describe("Auth pages on short viewports", () => {
	for (const viewport of [LANDSCAPE_PHONE, ZOOM_200]) {
		test(`login actions are reachable at ${viewport.width}x${viewport.height}`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport)
			await page.goto("/login")

			for (const name of [/^sign in$/i, /passkey/i]) {
				await wheelUntilInViewport(page, page.getByRole("button", { name }))
			}
		})
	}

	test("register first step can be scrolled to its last action", async ({
		page,
	}) => {
		await page.setViewportSize(LANDSCAPE_PHONE)
		await page.goto("/register")

		await wheelUntilInViewport(
			page,
			page.getByRole("button", { name: /continue/i }).last(),
		)
	})
})
