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
		// Arrange - use unique value to avoid conflicts
		const db = getPrisma();
		const testValue = `E2E Testing ${Date.now()}`;
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: testValue },
			create: { key: "CONFERENCE_SUBTITLE", value: testValue },
		});

		// Verify DB write completed
		const verified = await db.appSetting.findUnique({
			where: { key: "CONFERENCE_SUBTITLE" },
		});
		if (verified?.value !== testValue) {
			throw new Error("DB write not reflected");
		}

		// Act
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto(`/login?_cb=${Date.now()}`, { waitUntil: "networkidle" });

		// Assert
		await expect(page.getByText(testValue)).toBeVisible({ timeout: 10000 });
	});

	test("hides subtitle when empty", async ({ page }) => {
		// Arrange
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: "" },
			create: { key: "CONFERENCE_SUBTITLE", value: "" },
		});

		// Verify DB write completed
		const verified = await db.appSetting.findUnique({
			where: { key: "CONFERENCE_SUBTITLE" },
		});
		if (verified?.value !== "") {
			throw new Error("DB write not reflected");
		}

		// Act
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto(`/login?_cb=${Date.now()}`, { waitUntil: "networkidle" });

		// Assert
		// Subtitle paragraph should not exist in DOM when empty
		const subtitleLocator = page.locator('.text-sm.font-medium.text-primary-foreground\\/90');
		await expect(subtitleLocator).not.toBeVisible();
	});

	test("subtitle updates dynamically", async ({ page }) => {
		// Arrange - verify subtitle changes are reflected
		const db = getPrisma();
		const testValue = `Dynamic Test ${Date.now()}`;
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: testValue },
			create: { key: "CONFERENCE_SUBTITLE", value: testValue },
		});

		// Verify DB write completed
		const verified = await db.appSetting.findUnique({
			where: { key: "CONFERENCE_SUBTITLE" },
		});
		if (verified?.value !== testValue) {
			throw new Error("DB write not reflected");
		}

		// Act & Assert
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto(`/register?_cb=${Date.now()}`, { waitUntil: "networkidle" });
		await page.locator('.bg-primary.p-6').waitFor({ state: 'visible', timeout: 5000 });
		await expect(page.getByText(testValue)).toBeVisible({ timeout: 10000 });
	});

	test("long subtitle wraps properly", async ({ page }) => {
		// Arrange - use unique long value
		const db = getPrisma();
		const longSubtitle = `Very Long Conference Title ${Date.now()} on Advanced Computer Methods in Materials Technology and Engineering Applications`;
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: longSubtitle },
			create: { key: "CONFERENCE_SUBTITLE", value: longSubtitle },
		});

		// Verify DB write completed
		const verified = await db.appSetting.findUnique({
			where: { key: "CONFERENCE_SUBTITLE" },
		});
		if (verified?.value !== longSubtitle) {
			throw new Error("DB write not reflected");
		}

		// Act
		await page.setViewportSize({ width: 1024, height: 768 });
		await page.goto(`/login?_cb=${Date.now()}`, { waitUntil: "networkidle" });

		// Assert - should be visible (wrapping, not clipped)
		await expect(page.getByText(longSubtitle)).toBeVisible({ timeout: 10000 });
	});
});
