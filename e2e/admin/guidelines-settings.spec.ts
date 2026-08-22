import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { setAppSetting, getPrisma } from "../helpers/test-db";
import { TEST_USER } from "../helpers/test-users";
import { loginAs } from "../helpers/auth";

// Both describes share SUBMISSION_GUIDELINES DB setting — must be serial
test.describe.configure({ mode: "serial" });

test.describe("Admin Settings - Submission Guidelines", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToSubmissionsTab(testInfo);
	});

	test("admin can configure submission guidelines", async ({ page }) => {
		const customGuidelines = "Custom submission guideline for E2E test";

		const guidelinesTextarea = page.getByPlaceholder("- Title should be concise...");
		await expect(guidelinesTextarea).toBeVisible();
		await guidelinesTextarea.clear();
		await guidelinesTextarea.fill(customGuidelines);
		await page.getByRole("button", { name: "Save All Settings" }).click();

		await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
	});

	test("admin can configure review guidelines", async ({ page }) => {
		const customGuidelines = "Custom review guideline for E2E test";

		const guidelinesTextarea = page.getByPlaceholder("- Provide constructive feedback...");
		await expect(guidelinesTextarea).toBeVisible();
		await guidelinesTextarea.clear();
		await guidelinesTextarea.fill(customGuidelines);
		await page.getByRole("button", { name: "Save All Settings" }).click();

		await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
	});

	test("submission guidelines show placeholder badges", async ({ page }) => {
		await expect(page.getByText("{{minAbstractLength}}", { exact: true })).toBeVisible();
		await expect(page.getByText("{{maxAbstractLength}}", { exact: true })).toBeVisible();
		await expect(page.getByText("{{minKeywords}}", { exact: true })).toBeVisible();
		await expect(page.getByText("{{maxKeywords}}", { exact: true })).toBeVisible();
	});

	test.afterAll(async () => {
		const db = getPrisma();
		await db.appSetting.deleteMany({
			where: { key: { in: ["SUBMISSION_GUIDELINES", "REVIEW_GUIDELINES"] } },
		});
	});
});

test.describe("Submission Form - Custom Guidelines", () => {
	test("submission form shows custom guidelines from settings", async ({ page }, testInfo) => {
		// Guidelines card is in sidebar, hidden on mobile viewport
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip();
			return;
		}
		await setAppSetting(
			"SUBMISSION_GUIDELINES" as Parameters<typeof setAppSetting>[0],
			"Custom E2E guideline: Follow these rules carefully",
		);

		await loginAs(page, TEST_USER, { clearCookies: true });
		await page.goto("/submissions/new");
		await page.getByLabel("Title").waitFor({ state: "visible", timeout: 30000 });

		await expect(
			page.getByText("Custom E2E guideline: Follow these rules carefully"),
		).toBeVisible();

		const db = getPrisma();
		await db.appSetting.deleteMany({
			where: { key: "SUBMISSION_GUIDELINES" },
		});
	});
});
