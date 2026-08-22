import { test, expect } from "../helpers/base-fixtures";
import { TEST_USER } from "../helpers/test-users";

const DISPLAY_NAME = `${TEST_USER.firstName} ${TEST_USER.lastName}`;

async function openThemeSubmenu(page: import("@playwright/test").Page) {
	await page.getByText(DISPLAY_NAME).click();
	await page.getByText("Theme").click();
}

test.describe("Theme switching", () => {
	// Sidebar user menu is hidden on mobile viewport
	test.beforeEach(({}, testInfo) => {
		test.skip(testInfo.project.name.startsWith("mobile"), "Desktop only — sidebar not visible on mobile");
	});

	test("switches to dark theme", async ({ page }) => {
		await page.goto("/");
		await page.getByText(DISPLAY_NAME).waitFor({ state: "visible" });

		await openThemeSubmenu(page);
		await page.getByRole("menuitem", { name: "Dark" }).click();

		await expect(page.locator("html")).toHaveClass(/dark/);
	});

	test("switches to light theme", async ({ page }) => {
		await page.goto("/");
		await page.getByText(DISPLAY_NAME).waitFor({ state: "visible" });

		await openThemeSubmenu(page);
		await page.getByRole("menuitem", { name: "Light" }).click();

		await expect(page.locator("html")).not.toHaveClass(/dark/);
	});

	test("persists dark theme after reload", async ({ page }) => {
		await page.goto("/");
		await page.getByText(DISPLAY_NAME).waitFor({ state: "visible" });

		await openThemeSubmenu(page);
		await page.getByRole("menuitem", { name: "Dark" }).click();
		await expect(page.locator("html")).toHaveClass(/dark/);

		// Wait for setThemeFn POST to persist cookie before reloading
		await expect(async () => {
			const cookies = await page.context().cookies();
			const theme = cookies.find((c) => c.name === "_preferred-theme");
			expect(theme?.value).toBe("dark");
		}).toPass();

		await page.reload();
		await page.getByText(DISPLAY_NAME).waitFor({ state: "visible" });

		await expect(page.locator("html")).toHaveClass(/dark/);
	});

	test("system theme follows OS preference", async ({ page }) => {
		await page.emulateMedia({ colorScheme: "dark" });
		await page.goto("/");
		await page.getByText(DISPLAY_NAME).waitFor({ state: "visible" });

		await openThemeSubmenu(page);
		await page.getByRole("menuitem", { name: "System" }).click();

		await expect(page.locator("html")).toHaveClass(/dark/);

		// Wait for setThemeFn + router.invalidate to complete (sets up matchMedia listener)
		await expect(async () => {
			const cookies = await page.context().cookies();
			const theme = cookies.find((c) => c.name === "_preferred-theme");
			expect(theme?.value).toBe("system");
		}).toPass();

		await page.emulateMedia({ colorScheme: "light" });

		await expect(page.locator("html")).not.toHaveClass(/dark/);
	});
});
