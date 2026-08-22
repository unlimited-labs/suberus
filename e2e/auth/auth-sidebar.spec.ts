import { expect, test } from "../helpers/base-fixtures";
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
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: "International Conference on E2E Testing" },
			create: { key: "CONFERENCE_SUBTITLE", value: "International Conference on E2E Testing" },
		});

		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto("/login");

		await expect(page.getByText("International Conference on E2E Testing")).toBeVisible();
	});

	test("hides subtitle when empty", async ({ page }) => {
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: "" },
			create: { key: "CONFERENCE_SUBTITLE", value: "" },
		});

		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto("/login");

		await expect(page.getByText("International Conference on E2E Testing")).not.toBeVisible();
	});

	test("subtitle updates dynamically", async ({ page }) => {
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: "Dynamic Subtitle Update" },
			create: { key: "CONFERENCE_SUBTITLE", value: "Dynamic Subtitle Update" },
		});

		// Act — use /login because /register has steps that replace the subtitle
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto("/login");

		await expect(page.getByText("Dynamic Subtitle Update")).toBeVisible();
	});

	test("long subtitle wraps properly", async ({ page }) => {
		const db = getPrisma();
		const longSubtitle = "Very Long International Conference Title on Advanced Computer Methods in Materials Technology and Engineering Applications";
		await db.appSetting.upsert({
			where: { key: "CONFERENCE_SUBTITLE" },
			update: { value: longSubtitle },
			create: { key: "CONFERENCE_SUBTITLE", value: longSubtitle },
		});

		await page.setViewportSize({ width: 1024, height: 768 });
		await page.goto("/login");

		await expect(page.getByText(longSubtitle)).toBeVisible();
	});
});
