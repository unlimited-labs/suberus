import { expect, test } from "./fixtures"

test("reduced motion turns entrance animations off", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
	await page.goto("/login")

	const name = await page
		.locator(".animate-in")
		.first()
		.evaluate((el) => getComputedStyle(el).animationName)
	expect(name).toBe("none")
})
