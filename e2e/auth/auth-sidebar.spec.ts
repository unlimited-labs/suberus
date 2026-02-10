import { expect, test } from "@playwright/test";
import { getPrisma } from "../helpers/test-db";

test.describe.serial("AuthSidebar Conference Subtitle", () => {
	let originalSubtitle: string;

	test.beforeAll(async () => {
		const db = getPrisma();
		const setting = await db.appSetting.findUnique({
			where: { key: "CONFERENCE_SUBTITLE" },
		});
		originalSubtitle = (setting?.value as string) ?? "";
	});

	test.afterAll(async () => {
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: originalSubtitle },
			create: { key: "CONFERENCE_SUBTITLE", value: originalSubtitle },
		});
	});

	test("displays subtitle below conference name when set", async ({ page }) => {
		// Arrange
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: "International Conference on E2E Testing" },
			create: { key: "CONFERENCE_SUBTITLE", value: "International Conference on E2E Testing" },
		});

		// Act
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto("/login", { waitUntil: "networkidle" });

		// Assert
		await expect(page.getByText("International Conference on E2E Testing")).toBeVisible({ timeout: 10000 });
	});

	test("hides subtitle when empty", async ({ page }) => {
		// Arrange
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: "" },
			create: { key: "CONFERENCE_SUBTITLE", value: "" },
		});

		// Act
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto("/login", { waitUntil: "networkidle" });

		// Assert
		// Subtitle paragraph should not exist in DOM when empty
		const subtitleLocator = page.locator('.text-sm.font-medium.text-primary-foreground\\/90');
		await expect(subtitleLocator).not.toBeVisible();
	});

	test("subtitle appears on all auth pages", async ({ page }) => {
		// Arrange
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: "Multi-Page Test Subtitle" },
			create: { key: "CONFERENCE_SUBTITLE", value: "Multi-Page Test Subtitle" },
		});

		// Act & Assert
		await page.setViewportSize({ width: 1280, height: 720 });
		const pages = ["/login", "/register", "/forgot-password"];
		for (const route of pages) {
			await page.goto(route, { waitUntil: "networkidle" });
			// Wait for sidebar to be visible (ensures page loaded)
			await page.locator('.bg-primary.p-6').waitFor({ state: 'visible', timeout: 5000 });
			await expect(page.getByText("Multi-Page Test Subtitle")).toBeVisible({ timeout: 10000 });
		}
	});

	test("long subtitle wraps properly", async ({ page }) => {
		// Arrange
		const db = getPrisma();
		const longSubtitle = "Very Long International Conference Title on Advanced Computer Methods in Materials Technology and Engineering Applications";
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: longSubtitle },
			create: { key: "CONFERENCE_SUBTITLE", value: longSubtitle },
		});

		// Act
		await page.setViewportSize({ width: 1024, height: 768 });
		await page.goto("/login", { waitUntil: "networkidle" });

		// Assert - should be visible (wrapping, not clipped)
		await expect(page.getByText(longSubtitle)).toBeVisible({ timeout: 10000 });
	});
});
