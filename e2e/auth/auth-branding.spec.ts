import { test, expect } from "@playwright/test"
import { getPrisma } from "../helpers/test-db"

const BRANDING_KEYS = [
	"CONFERENCE_NAME",
	"CONFERENCE_DATE_START",
	"CONFERENCE_DATE_END",
	"CONFERENCE_LOCATION",
	"BRANDING_LOGO_URL",
	"BRANDING_PRIMARY_COLOR",
	"BRANDING_SECONDARY_COLOR",
] as const

type BrandingKey = (typeof BRANDING_KEYS)[number]

const TEST_DATA: Record<string, string> = {
	CONFERENCE_NAME: "E2E Test Conference 2026",
	CONFERENCE_DATE_START: "2026-06-15",
	CONFERENCE_DATE_END: "2026-06-18",
	CONFERENCE_LOCATION: "Warsaw, Poland",
	BRANDING_LOGO_URL: "/logo.png",
	BRANDING_PRIMARY_COLOR: "#e11d48",
	BRANDING_SECONDARY_COLOR: "#7c3aed",
}

async function seedBrandingData() {
	const db = getPrisma()
	for (const [key, value] of Object.entries(TEST_DATA)) {
		await db.appSetting.upsert({
			where: { key: key as BrandingKey },
			update: { value },
			create: { key: key as BrandingKey, value },
		})
	}
}

test.describe("Auth Page Branding", { tag: "@serial" }, () => {
	test.describe.configure({ mode: "serial" });
	let originalValues: Map<BrandingKey, string | null>

	test.beforeAll(async () => {
		// Arrange — store original values for cleanup
		const db = getPrisma()
		originalValues = new Map()
		for (const key of BRANDING_KEYS) {
			const setting = await db.appSetting.findUnique({ where: { key } })
			originalValues.set(key, (setting?.value as string) ?? null)
		}
	})

	test.beforeEach(async () => {
		// Arrange — idempotent seed before every test (parallel-safe)
		await seedBrandingData()
	})

	test.afterAll(async () => {
		// Restore original values (best-effort per-worker)
		const db = getPrisma()
		for (const [key, value] of originalValues) {
			if (value === null) {
				await db.appSetting.deleteMany({ where: { key } })
			} else {
				await db.appSetting.upsert({
					where: { key },
					update: { value },
					create: { key, value },
				})
			}
		}
	})

	test("login page shows conference name in mobile header", async ({ page }) => {
		// Act
		await page.goto("/login")

		// Assert
		await expect(page.getByRole("heading", { name: "E2E Test Conference 2026" })).toBeVisible()
	})

	test("login page sidebar shows conference info", async ({ page }, testInfo) => {
		// Arrange — sidebar is desktop only
		test.skip(testInfo.project.name === "mobile", "Sidebar hidden on mobile")

		// Act
		await page.goto("/login")

		// Assert
		await expect(page.getByText("E2E Test Conference 2026").first()).toBeVisible()
		await expect(page.getByText("Warsaw, Poland")).toBeVisible()
	})

	test("login page sidebar shows formatted date range", async ({ page }, testInfo) => {
		// Arrange — sidebar is desktop only
		test.skip(testInfo.project.name === "mobile", "Sidebar hidden on mobile")

		// Act
		await page.goto("/login")

		// Assert — formatted using default DD.MM.YYYY format
		await expect(page.getByText(/15\.06\.2026/)).toBeVisible()
	})

	test("register page shows conference name in mobile header", async ({ page }) => {
		// Act
		await page.goto("/register")

		// Assert
		await expect(page.getByRole("heading", { name: "E2E Test Conference 2026" })).toBeVisible()
	})

	test("forgot-password page shows conference name in mobile header", async ({ page }) => {
		// Act
		await page.goto("/forgot-password")

		// Assert
		await expect(page.getByRole("heading", { name: "E2E Test Conference 2026" })).toBeVisible()
	})

	test("verify-email page shows conference name in mobile header", async ({ page }) => {
		// Act
		await page.goto("/verify-email")

		// Assert
		await expect(page.getByRole("heading", { name: "E2E Test Conference 2026" })).toBeVisible()
	})

	test("reset-password page shows conference name", async ({ page }) => {
		// Act
		await page.goto("/reset-password")

		// Assert — reset-password without token shows error state, but header branding still renders
		const headerBranding = page.locator("header").getByText("E2E Test Conference 2026")
		await expect(headerBranding).toBeVisible()
	})

	test("auth layout header shows conference name", async ({ page }) => {
		// Act
		await page.goto("/login")

		// Assert — the top-left branding strip
		const brandingText = page.locator("header").getByText("E2E Test Conference 2026")
		await expect(brandingText).toBeVisible()
	})

	test("auth layout header shows custom logo", async ({ page }) => {
		// Act
		await page.goto("/login")

		// Assert
		const logo = page.locator("header img[alt='Conference Logo']")
		await expect(logo).toBeVisible()
		await expect(logo).toHaveAttribute("src", "/logo.png")
	})

	test("custom primary color applies CSS variable on auth pages", async ({ page }) => {
		// Act
		await page.goto("/login")

		// Assert
		const wrapper = page.locator("[style*='--primary']")
		await expect(wrapper).toBeAttached()
		const style = await wrapper.getAttribute("style")
		expect(style).toContain("#e11d48")
	})

	test("register page sidebar shows conference info with steps", async ({ page }, testInfo) => {
		// Arrange — sidebar is desktop only
		test.skip(testInfo.project.name === "mobile", "Sidebar hidden on mobile")

		// Act
		await page.goto("/register")

		// Assert — sidebar shows conference name + step indicators
		await expect(page.getByText("E2E Test Conference 2026").first()).toBeVisible()
		await expect(page.getByText("Author Information", { exact: true })).toBeVisible()
	})
})
