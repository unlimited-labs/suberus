import { expect, test } from "@playwright/test";
import { getPrisma } from "../helpers/test-db";

test.describe("AuthSidebar Conference Subtitle", () => {
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
		await page.goto("/login");

		// Assert
		await expect(page.getByText("International Conference on E2E Testing")).toBeVisible();
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
		await page.goto("/login");

		// Assert
		// Subtitle paragraph should not exist in DOM
		await expect(page.locator('text="International Conference"')).not.toBeVisible();
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
		const pages = ["/login", "/register", "/forgot-password"];
		for (const route of pages) {
			await page.goto(route);
			await expect(page.getByText("Multi-Page Test Subtitle")).toBeVisible();
		}
	});

	test("long subtitle wraps on mobile", async ({ page }) => {
		// Arrange
		const db = getPrisma();
		const longSubtitle = "Very Long International Conference Title on Advanced Computer Methods in Materials Technology and Engineering Applications";
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: longSubtitle },
			create: { key: "CONFERENCE_SUBTITLE", value: longSubtitle },
		});

		// Act
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/login");

		// Assert - should be visible (wrapping, not clipped)
		await expect(page.getByText(longSubtitle)).toBeVisible();
	});
});
