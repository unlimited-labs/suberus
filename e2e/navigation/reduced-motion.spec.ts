import { expect, test } from "./fixtures"

test("reduced motion shortens entrance animations", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
	await page.goto("/login")

	const duration = await page
		.locator(".animate-in")
		.first()
		.evaluate((el) => getComputedStyle(el).animationDuration)
	expect(Number.parseFloat(duration)).toBeLessThan(0.001)
})
