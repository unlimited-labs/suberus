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
		const logoInput = adminSettingsPage.getLogoUrlInput();
		const faviconInput = adminSettingsPage.getFaviconUrlInput();

		await logoInput.fill("/logo.png");
		await faviconInput.fill("/favicon.ico");
		await adminSettingsPage.saveBrandingSection("Logo & Graphics");

		await expect(page.getByText("Branding settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("can save theme colors", async ({ page }) => {
		const primaryInput = adminSettingsPage.getPrimaryColorInput();
		const secondaryInput = adminSettingsPage.getSecondaryColorInput();

		await primaryInput.fill("#ff0000");
		await secondaryInput.fill("#00ff00");
		await adminSettingsPage.saveBrandingSection("Theme Colors");

		await expect(page.getByText("Branding settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("can save footer text", async ({ page }) => {
		const footerInput = adminSettingsPage.getFooterTextInput();

		await footerInput.fill("© 2026 Test Conference");
		await adminSettingsPage.saveBrandingSection("Footer");

		await expect(page.getByText("Branding settings saved")).toBeVisible({ timeout: 10000 });
	});

	test("branding settings persist across reloads", async ({ page }, testInfo) => {
		const primaryInput = adminSettingsPage.getPrimaryColorInput();

		await primaryInput.fill("#e11d48");
		await adminSettingsPage.saveBrandingSection("Theme Colors");
		await expect(page.getByText("Branding settings saved")).toBeVisible({ timeout: 10000 });
		await page.reload();
		await adminSettingsPage.switchToBrandingTab(testInfo);

		await expect(adminSettingsPage.getPrimaryColorInput()).toHaveValue("#e11d48");
	});

	test("custom primary color applies CSS variable", async ({ page }) => {
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "BRANDING_PRIMARY_COLOR" },
			update: { value: "#e11d48" },
			create: { key: "BRANDING_PRIMARY_COLOR", value: "#e11d48" },
		});

		await page.goto("/");

		const wrapper = page.locator("[style*=\"--primary\"]");
		await expect(wrapper).toBeAttached();
		const style = await wrapper.getAttribute("style");
		expect(style).toContain("#e11d48");
	});

	test("footer text appears on the page", async ({ page }) => {
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "BRANDING_FOOTER_TEXT" },
			update: { value: "E2E Footer Test" },
			create: { key: "BRANDING_FOOTER_TEXT", value: "E2E Footer Test" },
		});

		await page.goto("/");

		await expect(page.locator("footer")).toHaveText("E2E Footer Test");
	});

	test("sidebar shows custom logo", async ({ page }, testInfo) => {
		const db = getPrisma();
		await db.appSetting.upsert({
			where: { key: "BRANDING_LOGO_URL" },
			update: { value: "/logo.png" },
			create: { key: "BRANDING_LOGO_URL", value: "/logo.png" },
		});

		await page.goto("/");

		// Assert — desktop shows the logo in the sidebar <aside>; on mobile the sidebar
		// is hidden and lives in a drawer, so open the menu and assert the same lockup
		// (alt="Suberus") inside it. The mobile top bar no longer carries a logo.
		if (testInfo.project.name === "mobile-admin") {
			await page.getByRole("button", { name: "Menu" }).click();
		}
		const logo = page.locator("img[alt='Suberus']").filter({ visible: true });
		await expect(logo).toBeVisible();
		await expect(logo).toHaveAttribute("src", /\/logo\.png/);
	});

	test("page title includes conference name", async ({ page }) => {
		const db = getPrisma();
		const setting = await db.appSetting.findUnique({
			where: { key: "CONFERENCE_NAME" },
		});
		const conferenceName = (setting?.value as string) || "Conference Name";

		await page.goto("/");

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
		const fileInput = adminSettingsPage.getAuthBackgroundFileInput();

		await fileInput.setInputFiles(BG_FIXTURE_1);

		await expect(page.getByText("Background image uploaded")).toBeVisible({ timeout: 15000 });
		await expect(adminSettingsPage.getAuthBackgroundPreview()).toBeVisible();
	});

	test("background image visible on login page", async ({ page }) => {
		const savedState = await page.context().storageState();
		await page.context().clearCookies();

		await page.goto("/login");
		await expect(page.getByLabel("E-mail")).toBeVisible({ timeout: 15000 });

		await expect(page.getByTestId("auth-background-image")).toBeVisible();

		await page.context().addCookies(savedState.cookies);
	});

	test("can replace background image", async ({ page }) => {
		const fileInput = adminSettingsPage.getAuthBackgroundFileInput();

		await fileInput.setInputFiles(BG_FIXTURE_2);

		await expect(page.getByText("Background image uploaded")).toBeVisible({ timeout: 15000 });
		await expect(adminSettingsPage.getAuthBackgroundPreview()).toBeVisible();
	});

	test("can remove background image", async ({ page }) => {
		const removeButton = adminSettingsPage.getAuthBackgroundRemoveButton();

		await removeButton.click();

		await expect(page.getByText("Background image removed")).toBeVisible({ timeout: 15000 });
		await expect(adminSettingsPage.getAuthBackgroundPreview()).not.toBeVisible();
	});

	test("login page reverts to default after removal", async ({ page }) => {
		const savedState = await page.context().storageState();
		await page.context().clearCookies();

		await page.goto("/login");
		await expect(page.getByLabel("E-mail")).toBeVisible({ timeout: 15000 });

		await expect(page.getByTestId("auth-background-image")).not.toBeVisible();

		await page.context().addCookies(savedState.cookies);
	});
});

test.describe.serial("Logo & Favicon upload", () => {
	let adminSettingsPage: AdminSettingsPage;
	let restoreSettings: () => Promise<void>;

	test.beforeAll(async () => {
		({ restore: restoreSettings } = await snapshotAppSettings([
			"BRANDING_LOGO_KEY",
			"BRANDING_FAVICON_KEY",
		]));
	});

	test.afterAll(async () => {
		await restoreSettings();
	});

	test.beforeEach(async ({ page }, testInfo) => {
		adminSettingsPage = new AdminSettingsPage(page);
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToBrandingTab(testInfo);
	});

	test("can upload and remove a logo", async ({ page }) => {
		await adminSettingsPage.getLogoFileInput().setInputFiles(BG_FIXTURE_1);

		await expect(page.getByText("Logo uploaded")).toBeVisible({ timeout: 15000 });
		const logoImg = adminSettingsPage.getLogoPreview().locator("img");
		await expect(logoImg).toHaveAttribute("src", /\/api\/branding\/logo/);
		await expect
			.poll(() => logoImg.evaluate((el: HTMLImageElement) => el.naturalWidth), {
				timeout: 15000,
			})
			.toBeGreaterThan(0);

		await adminSettingsPage.getLogoRemoveButton().click();

		await expect(page.getByText("Logo removed")).toBeVisible({ timeout: 15000 });
	});

	test("can upload and remove a favicon", async ({ page }) => {
		await adminSettingsPage.getFaviconFileInput().setInputFiles(BG_FIXTURE_1);

		await expect(page.getByText("Favicon uploaded")).toBeVisible({ timeout: 15000 });
		const faviconImg = page.getByTestId("favicon-preview").locator("img");
		await expect(faviconImg).toHaveAttribute("src", /\/api\/branding\/favicon/);
		await expect
			.poll(
				() => faviconImg.evaluate((el: HTMLImageElement) => el.naturalWidth),
				{ timeout: 15000 },
			)
			.toBeGreaterThan(0);

		await adminSettingsPage.getFaviconRemoveButton().click();

		await expect(page.getByText("Favicon removed")).toBeVisible({ timeout: 15000 });
	});
});
