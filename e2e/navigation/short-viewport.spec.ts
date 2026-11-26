import { expect, test } from "./fixtures"

const LANDSCAPE_PHONE = { width: 667, height: 320 }
const ZOOM_200 = { width: 640, height: 400 }

test.describe("Auth pages on short viewports", () => {
	for (const viewport of [LANDSCAPE_PHONE, ZOOM_200]) {
		test(`login actions are reachable at ${viewport.width}x${viewport.height}`, async ({
			page,
		}) => {
			await page.setViewportSize(viewport)
			await page.goto("/login")

			for (const name of [/^sign in$/i, /passkey/i]) {
				const button = page.getByRole("button", { name })
				await button.scrollIntoViewIfNeeded()
				await expect(button).toBeInViewport()
			}
		})
	}

	test("register first step can be scrolled to its last action", async ({
		page,
	}) => {
		await page.setViewportSize(LANDSCAPE_PHONE)
		await page.goto("/register")

		const next = page.getByRole("button", { name: /continue|next/i }).last()
		await next.scrollIntoViewIfNeeded()
		await expect(next).toBeInViewport()
	})
})
