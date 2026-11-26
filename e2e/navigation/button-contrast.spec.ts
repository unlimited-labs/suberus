import { expect, test } from "./fixtures"

for (const colorScheme of ["light", "dark"] as const) {
	test(`primary button text reaches 4.5:1 in ${colorScheme} mode`, async ({ page }) => {
		await page.emulateMedia({ colorScheme })
		await page.goto("/login")

		const ratio = await page.getByRole("button", { name: /^sign in$/i }).evaluate((el) => {
			const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
			const lum = ([r, g, b]: number[]) =>
				[r, g, b]
					.map((c) => c / 255)
					.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
					.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
			const style = getComputedStyle(el)
			const [a, b] = [lum(rgb(style.color)), lum(rgb(style.backgroundColor))]
			return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
		})
		expect(ratio).toBeGreaterThanOrEqual(4.5)
	})
}
