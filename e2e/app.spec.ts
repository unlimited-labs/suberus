import { expect, test } from "@playwright/test";

test("app loads and shows login page", async ({ page }) => {
	// Arrange & Act
	await page.goto("/");

	// Assert
	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByLabel("E-mail")).toBeVisible();
	await expect(page.getByLabel("Password")).toBeVisible();
	await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
