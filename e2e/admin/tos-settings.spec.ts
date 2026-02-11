import { test, expect } from "./fixtures";
import { getPrisma } from "../helpers/test-db";

test.describe("Admin Settings - Terms of Service", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		// Arrange
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToTosTab(testInfo);
	});

	test("admin sees ToS content textarea", async ({ page }) => {
		// Assert
		const textarea = page.getByLabel("Content");
		await expect(textarea).toBeVisible();
		// Should contain seeded content
		await expect(textarea).not.toHaveValue("");
	});

	test("admin edits and saves ToS markdown", async ({ page }) => {
		// Arrange
		const newContent = "# Updated ToS\n\nNew terms for E2E test.";

		// Act
		const textarea = page.getByLabel("Content");
		await textarea.clear();
		await textarea.fill(newContent);
		await page.getByRole("button", { name: "Save Terms of Service" }).click();

		// Assert
		await expect(page.getByText("Terms of Service saved")).toBeVisible();

		// Cleanup — restore original content
		const db = getPrisma();
		await db.appSetting.update({
			where: { key: "TOS_CONTENT" },
			data: {
				value: "# Terms of Service\n\nBy using this system, you agree to the following terms and conditions.\n\n## Usage\n\nThis system is provided for academic conference management purposes only.",
			},
		});
	});

	test("markdown hint is visible", async ({ page }) => {
		// Assert
		await expect(page.getByText("Supports Markdown")).toBeVisible();
	});
});
