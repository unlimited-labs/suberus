import { expect, test } from "@playwright/test";
import { AdminSettingsPage } from "./fixtures";
import { getPrisma } from "../helpers/test-db";

const BRANDING_KEYS = [
	"BRANDING_LOGO_URL",
	"BRANDING_FAVICON_URL",
	"BRANDING_PRIMARY_COLOR",
	"BRANDING_SECONDARY_COLOR",
	"BRANDING_FOOTER_TEXT",
] as const;

type BrandingKey = (typeof BRANDING_KEYS)[number];

test.describe.serial("Admin Branding Settings", () => {
	let adminSettingsPage: AdminSettingsPage;
	let originalValues: Map<BrandingKey, string | null>;

	test.beforeAll(async () => {
		const db = getPrisma();
		originalValues = new Map();
		for (const key of BRANDING_KEYS) {
			const setting = await db.appSetting.findUnique({ where: { key } });
			originalValues.set(key, (setting?.value as string) ?? null);
		}
	});

	test.afterAll(async () => {
		const db = getPrisma();
		for (const [key, value] of originalValues) {
			if (value === null) {
				await db.appSetting.deleteMany({ where: { key } });
			} else {
				await db.appSetting.upsert({
					where: { key },
					update: { value },
					create: { key, value },
				});
			}
		}
	});

	test.beforeEach(async ({ page }, testInfo) => {
		adminSettingsPage = new AdminSettingsPage(page);
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToBrandingTab(testInfo);
	});

	test("can save logo and favicon URLs", async ({ page }) => {
		// Arrange
		const logoInput = adminSettingsPage.getLogoUrlInput();
		const faviconInput = adminSettingsPage.getFaviconUrlInput();

		// Act
		await logoInput.fill("/logo.png");
		await faviconInput.fill("/favicon.ico");
		await adminSettingsPage.saveBrandingSection("Logo & Graphics");

		// Assert
		await expect(page.getByText("Branding settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("can save theme colors", async ({ page }) => {
		// Arrange
		const primaryInput = adminSettingsPage.getPrimaryColorInput();
		const secondaryInput = adminSettingsPage.getSecondaryColorInput();

		// Act
		await primaryInput.fill("#ff0000");
		await secondaryInput.fill("#00ff00");
		await adminSettingsPage.saveBrandingSection("Theme Colors");

		// Assert
		await expect(page.getByText("Branding settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("can save footer text", async ({ page }) => {
		// Arrange
		const footerInput = adminSettingsPage.getFooterTextInput();

		// Act
		await footerInput.fill("© 2026 Test Conference");
		await adminSettingsPage.saveBrandingSection("Footer");

		// Assert
		await expect(page.getByText("Branding settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("branding settings persist across reloads", async ({ page }, testInfo) => {
		// Arrange
		const primaryInput = adminSettingsPage.getPrimaryColorInput();

		// Act
		await primaryInput.fill("#e11d48");
		await adminSettingsPage.saveBrandingSection("Theme Colors");
		await expect(page.getByText("Branding settings saved")).toBeVisible({ timeout: 10000 });
		await page.reload();
		await adminSettingsPage.switchToBrandingTab(testInfo);

		// Assert
		await expect(adminSettingsPage.getPrimaryColorInput()).toHaveValue("#e11d48");
	});

	test("custom primary color applies CSS variable", async ({ page }) => {
		// Arrange — set via DB to avoid UI dependency
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "BRANDING_PRIMARY_COLOR" },
			update: { value: "#e11d48" },
			create: { key: "BRANDING_PRIMARY_COLOR", value: "#e11d48" },
		});

		// Act
		await page.goto("/");

		// Assert
		const wrapper = page.locator("[style*=\"--primary\"]");
		await expect(wrapper).toBeAttached();
		const style = await wrapper.getAttribute("style");
		expect(style).toContain("#e11d48");
	});

	test("footer text appears on the page", async ({ page }) => {
		// Arrange — set via DB
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "BRANDING_FOOTER_TEXT" },
			update: { value: "E2E Footer Test" },
			create: { key: "BRANDING_FOOTER_TEXT", value: "E2E Footer Test" },
		});

		// Act
		await page.goto("/");

		// Assert
		await expect(page.locator("footer")).toHaveText("E2E Footer Test");
	});

	test("sidebar shows custom logo", async ({ page }, testInfo) => {
		// Arrange — set via DB
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "BRANDING_LOGO_URL" },
			update: { value: "/logo.png" },
			create: { key: "BRANDING_LOGO_URL", value: "/logo.png" },
		});

		// Act
		await page.goto("/");

		// Assert — desktop uses aside img[alt='Suberus'], mobile uses header img[alt='Logo']
		const logo =
			testInfo.project.name === "mobile-admin"
				? page.locator("img[alt='Logo']")
				: page.locator("aside img[alt='Suberus']");
		await expect(logo).toBeVisible();
		await expect(logo).toHaveAttribute("src", /\/logo\.png/);
	});

	test("page title includes conference name", async ({ page }) => {
		// Arrange
		const db = getPrisma();
		const setting = await db.appSetting.findUnique({
			where: { key: "CONFERENCE_NAME" },
		});
		const conferenceName = (setting?.value as string) || "Conference Name";

		// Act
		await page.goto("/");

		// Assert
		await expect(page).toHaveTitle(new RegExp(`${conferenceName}.*Suberus`, "i"));
	});
});
