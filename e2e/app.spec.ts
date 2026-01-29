import { expect, test } from "@playwright/test";

test("app loads and shows login page", async ({ page }) => {
	await page.goto("/");

	// Unauthenticated user should be redirected to login
	await expect(page).toHaveURL(/\/login/);

	// Login form elements should be visible (heading is hidden on mobile)
	await expect(page.getByLabel("E-mail")).toBeVisible();
	await expect(page.getByLabel("Password")).toBeVisible();
	await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
