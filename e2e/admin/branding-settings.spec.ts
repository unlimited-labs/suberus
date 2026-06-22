import path from "node:path";
import { test, expect, AdminSettingsPage } from "./fixtures";
import { getPrisma, snapshotAppSettings } from "../helpers/test-db";

const BRANDING_KEYS = [
	"BRANDING_LOGO_URL",
	"BRANDING_FAVICON_URL",
	"BRANDING_PRIMARY_COLOR",
	"BRANDING_SECONDARY_COLOR",
	"BRANDING_FOOTER_TEXT",
] as const;

test.describe.serial("Admin Branding Settings", () => {
	let adminSettingsPage: AdminSettingsPage;
	let restoreSettings: () => Promise<void>;

	test.beforeAll(async () => {
		({ restore: restoreSettings } = await snapshotAppSettings(BRANDING_KEYS));
	});

	test.afterAll(async () => {
		await restoreSettings();
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

		// Assert — desktop shows the logo in the sidebar <aside>; on mobile that sidebar
		// is hidden and the logo moves to the top header bar, where BrandLogo's alt is the
		// conference name (alt="Suberus" is only the sidebar lockup).
		let logoSelector: string;
		if (testInfo.project.name === "mobile-admin") {
			const setting = await db.appSetting.findUnique({
				where: { key: "CONFERENCE_NAME" },
			});
			const conferenceName = (setting?.value as string) || "Conference Name";
			logoSelector = `img[alt="${conferenceName}"]`;
		} else {
			logoSelector = "aside img[alt='Suberus']";
		}
		const logo = page.locator(logoSelector);
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

const BG_FIXTURE_1 = path.resolve("e2e/auth/fixtures/background_1.png");
const BG_FIXTURE_2 = path.resolve("e2e/auth/fixtures/background_2.png");

test.describe.serial("Auth Background Image", () => {
	let adminSettingsPage: AdminSettingsPage;
	let originalBgValue: string | null;

	test.beforeAll(async () => {
		const db = getPrisma();
		const setting = await db.appSetting.findUnique({
			where: { key: "BRANDING_AUTH_BACKGROUND_KEY" },
		});
		originalBgValue = (setting?.value as string) ?? null;
	});

	test.afterAll(async () => {
		const db = getPrisma();
		if (originalBgValue === null) {
			await db.appSetting.deleteMany({ where: { key: "BRANDING_AUTH_BACKGROUND_KEY" } });
		} else {
			await db.appSetting.upsert({
				where: { key: "BRANDING_AUTH_BACKGROUND_KEY" },
				update: { value: originalBgValue },
				create: { key: "BRANDING_AUTH_BACKGROUND_KEY", value: originalBgValue },
			});
		}
	});

	test.beforeEach(async ({ page }, testInfo) => {
		adminSettingsPage = new AdminSettingsPage(page);
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToBrandingTab(testInfo);
	});

	test("can upload background image", async ({ page }) => {
		// Arrange
		const fileInput = adminSettingsPage.getAuthBackgroundFileInput();

		// Act
		await fileInput.setInputFiles(BG_FIXTURE_1);

		// Assert
		await expect(page.getByText("Background image uploaded")).toBeVisible({ timeout: 15000 });
		await expect(adminSettingsPage.getAuthBackgroundPreview()).toBeVisible();
	});

	test("background image visible on login page", async ({ page }) => {
		// Arrange — save admin cookies, then clear so /login renders auth layout
		const savedState = await page.context().storageState();
		await page.context().clearCookies();

		// Act
		await page.goto("/login");
		await expect(page.getByLabel("E-mail")).toBeVisible({ timeout: 15000 });

		// Assert
		await expect(page.getByTestId("auth-background-image")).toBeVisible();

		// Restore admin session for subsequent serial tests
		await page.context().addCookies(savedState.cookies);
	});

	test("can replace background image", async ({ page }) => {
		// Arrange
		const fileInput = adminSettingsPage.getAuthBackgroundFileInput();

		// Act
		await fileInput.setInputFiles(BG_FIXTURE_2);

		// Assert
		await expect(page.getByText("Background image uploaded")).toBeVisible({ timeout: 15000 });
		await expect(adminSettingsPage.getAuthBackgroundPreview()).toBeVisible();
	});

	test("can remove background image", async ({ page }) => {
		// Arrange
		const removeButton = adminSettingsPage.getAuthBackgroundRemoveButton();

		// Act
		await removeButton.click();

		// Assert
		await expect(page.getByText("Background image removed")).toBeVisible({ timeout: 15000 });
		await expect(adminSettingsPage.getAuthBackgroundPreview()).not.toBeVisible();
	});

	test("login page reverts to default after removal", async ({ page }) => {
		// Arrange — save admin cookies, then clear
		const savedState = await page.context().storageState();
		await page.context().clearCookies();

		// Act
		await page.goto("/login");
		await expect(page.getByLabel("E-mail")).toBeVisible({ timeout: 15000 });

		// Assert
		await expect(page.getByTestId("auth-background-image")).not.toBeVisible();

		// Restore admin session
		await page.context().addCookies(savedState.cookies);
	});
});
