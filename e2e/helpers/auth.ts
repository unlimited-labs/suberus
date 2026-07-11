import { type Page } from "@playwright/test"

export async function loginAs(
	page: Page,
	user: { email: string; password: string },
	options?: { clearCookies?: boolean },
) {
	if (options?.clearCookies) {
		await page.context().clearCookies()
	}
	await page.goto("/login")
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 })
	await page.getByLabel("E-mail").fill(user.email)
	const passwordInput = page.getByLabel("Password", { exact: true })
	await passwordInput.fill(user.password)
	await passwordInput.press("Enter")
	await page.waitForURL("/", { timeout: 30000 })
}
