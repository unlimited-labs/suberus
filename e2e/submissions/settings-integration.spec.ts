import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Integration tests verifying that admin settings are properly reflected in the submission form.
 * These tests use two browser contexts: admin (to change settings) and user (to verify form).
 */

// Extend base test with admin and user contexts
interface SettingsIntegrationFixtures {
	adminContext: BrowserContext;
	adminPage: Page;
	userContext: BrowserContext;
	userPage: Page;
}

const test = base.extend<SettingsIntegrationFixtures>({
	adminContext: async ({ browser }, use) => {
		const context = await browser.newContext({
			storageState: "e2e/.auth/admin.json",
		});
		await use(context);
		await context.close();
	},
	adminPage: async ({ adminContext }, use) => {
		const page = await adminContext.newPage();
		await use(page);
		await page.close();
	},
	userContext: async ({ browser }, use) => {
		const context = await browser.newContext({
			storageState: "e2e/.auth/user.json",
		});
		await use(context);
		await context.close();
	},
	userPage: async ({ userContext }, use) => {
		const page = await userContext.newPage();
		await use(page);
		await page.close();
	},
});

// Helper: Navigate to admin submission settings tab
async function goToAdminSubmissionSettings(adminPage: Page) {
	await adminPage.goto("/admin/settings");
	await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
	await expect(adminPage.getByRole("heading", { name: "Title" })).toBeVisible();
}

// Helper: Navigate to admin submission types tab
async function goToAdminSubmissionTypes(adminPage: Page) {
	await adminPage.goto("/admin/settings");
	await adminPage.getByRole("tab", { name: /Submission Types/i }).click();
	await expect(adminPage.getByText("Oral Presentation")).toBeVisible();
}

// Helper: Save validation settings
async function saveValidationSettings(adminPage: Page) {
	await adminPage.getByRole("button", { name: "Save All Settings" }).click();
	await expect(adminPage.getByText("Submission settings saved")).toBeVisible({
		timeout: 5000,
	});
}

// These tests modify shared admin settings - must run serially
// afterAll ensures settings are restored even if a test fails mid-cleanup
test.describe.serial("Admin Settings Integration with Submission Form", () => {
	// Safety net: restore all settings to defaults after all tests complete
	test.afterAll(async ({ browser }) => {
		const context = await browser.newContext({
			storageState: "e2e/.auth/admin.json",
		});
		const page = await context.newPage();

		try {
			// Restore submission types (ensure Poster and Oral Presentation are active + TEXT format)
			await page.goto("/admin/settings");
			await page.getByRole("tab", { name: /Submission Types/i }).click();
			await expect(page.getByText("Oral Presentation")).toBeVisible();

			// Ensure Poster is active
			await page.getByRole("button", { name: /Poster/i }).first().click();
			await expect(page.getByText("Content Format")).toBeVisible();
			const posterSwitch = page.getByRole("switch").first();
			if ((await posterSwitch.getAttribute("aria-checked")) === "false") {
				await posterSwitch.click();
				await page.getByRole("button", { name: "Save" }).click();
				await expect(page.getByText(/"Poster" settings saved/i)).toBeVisible({ timeout: 5000 });
			}

			// Ensure Oral Presentation is TEXT format
			await page.reload();
			await page.getByRole("tab", { name: /Submission Types/i }).click();
			await expect(page.getByText("Oral Presentation")).toBeVisible();
			await page.getByRole("button", { name: /Oral Presentation/i }).first().click();
			await expect(page.getByText("Content Format")).toBeVisible();
			const formatSelect = page.locator("button").filter({ hasText: /Text \(Abstract\)|File Upload/i });
			if ((await formatSelect.textContent())?.includes("File")) {
				await formatSelect.click();
				await page.getByRole("option", { name: "Text (Abstract)" }).click();
				await page.getByRole("button", { name: "Save" }).click();
				await expect(page.getByText(/"Oral Presentation" settings saved/i)).toBeVisible({ timeout: 5000 });
			}

			// Restore validation settings
			await page.reload();
			await page.getByRole("tab", { name: /Submissions$/i }).click();
			await expect(page.getByRole("heading", { name: "Title" })).toBeVisible();

			// Ensure keywords enabled
			const keywordsSwitch = page.getByLabel("Enable keywords");
			if (!(await keywordsSwitch.isChecked())) {
				await keywordsSwitch.click();
			}

			// Restore keyword limits to 3-5
			const minKeywords = page.getByLabel("Min keywords");
			const maxKeywords = page.getByLabel("Max keywords");
			await minKeywords.clear();
			await minKeywords.fill("3");
			await maxKeywords.clear();
			await maxKeywords.fill("5");

			// Restore abstract min to 500
			const abstractMin = page.getByLabel("Min length (characters)").nth(1);
			await abstractMin.clear();
			await abstractMin.fill("500");

			// Restore max file size to 10
			const maxFileSize = page.getByLabel("Max file size (MB)");
			await maxFileSize.clear();
			await maxFileSize.fill("10");

			await page.getByRole("button", { name: "Save All Settings" }).click();
			await expect(page.getByText("Submission settings saved")).toBeVisible({ timeout: 5000 });
		} finally {
			await context.close();
		}
	});

	test("form respects disabled submission type", async ({
		adminPage,
		userPage,
	}) => {
		// Arrange - Admin: Disable POSTER
		await goToAdminSubmissionTypes(adminPage);
		await adminPage.getByRole("button", { name: /Poster/i }).first().click();
		await expect(adminPage.getByText("Content Format")).toBeVisible();
		const activeSwitch = adminPage.getByRole("switch").first();
		const wasActive = await activeSwitch.getAttribute("aria-checked");
		if (wasActive === "true") {
			await activeSwitch.click();
			await adminPage.getByRole("button", { name: "Save" }).click();
			await expect(
				adminPage.getByText(/"Poster" settings saved/i)
			).toBeVisible({ timeout: 5000 });
		}

		// Act - User: Navigate to form
		await userPage.goto("/submissions/new");

		// Assert - Disabled type not visible
		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();
		await expect(
			userPage.getByRole("button", { name: /Poster/i })
		).not.toBeVisible();

		// Cleanup: Re-enable POSTER
		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submission Types/i }).click();
		await expect(adminPage.getByText("Oral Presentation")).toBeVisible();
		await adminPage.getByRole("button", { name: /Poster/i }).first().click();
		await expect(adminPage.getByText("Content Format")).toBeVisible();
		const switchAfter = adminPage.getByRole("switch").first();
		const isNowActive = await switchAfter.getAttribute("aria-checked");
		if (isNowActive === "false") {
			await switchAfter.click();
			await adminPage.getByRole("button", { name: "Save" }).click();
			await expect(
				adminPage.getByText(/"Poster" settings saved/i)
			).toBeVisible({ timeout: 5000 });
		}
	});

	test("form respects custom abstract length limits", async ({
		adminPage,
		userPage,
	}) => {
		// Arrange - Admin: Change MIN_ABSTRACT_LENGTH to 200
		await goToAdminSubmissionSettings(adminPage);
		adminPage.locator("div").filter({
			hasText: /^Abstract$/,
		});
		const allMinInputs = adminPage.getByLabel("Min length (characters)");
		const abstractMinInput = allMinInputs.nth(1);
		const originalMin = await abstractMinInput.inputValue();
		await abstractMinInput.clear();
		await abstractMinInput.fill("200");
		await saveValidationSettings(adminPage);

		// Act - User: Navigate to form
		await userPage.goto("/submissions/new");

		// Assert - Form shows updated limit
		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();
		await expect(
			userPage.getByText(/0 \/ 200-\d+ characters/i)
		).toBeVisible({ timeout: 10000 });

		// Cleanup: Restore original value
		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Title" })
		).toBeVisible();
		const restoreMinInput = adminPage.getByLabel("Min length (characters)").nth(1);
		await restoreMinInput.clear();
		await restoreMinInput.fill(originalMin);
		await saveValidationSettings(adminPage);
	});

	test("form respects custom keyword limits", async ({
		adminPage,
		userPage,
	}) => {
		// Arrange - Admin: Change keyword limits
		await goToAdminSubmissionSettings(adminPage);
		const minKeywordsInput = adminPage.getByLabel("Min keywords");
		const maxKeywordsInput = adminPage.getByLabel("Max keywords");
		await expect(minKeywordsInput).toBeVisible();
		const originalMin = await minKeywordsInput.inputValue();
		const originalMax = await maxKeywordsInput.inputValue();
		await minKeywordsInput.clear();
		await minKeywordsInput.fill("2");
		await maxKeywordsInput.clear();
		await maxKeywordsInput.fill("4");
		await saveValidationSettings(adminPage);

		// Act - User: Navigate to form
		await userPage.goto("/submissions/new");

		// Assert - Form shows updated limits
		await expect(userPage.getByText(/0 \/ 2-4 keywords/i)).toBeVisible({ timeout: 10000 });

		// Cleanup: Restore original values
		await adminPage.goto("/admin/settings");
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Title" })
		).toBeVisible();
		const restoreMinInput = adminPage.getByLabel("Min keywords");
		const restoreMaxInput = adminPage.getByLabel("Max keywords");
		await expect(restoreMinInput).toBeVisible();
		await restoreMinInput.clear();
		await restoreMinInput.fill(originalMin);
		await restoreMaxInput.clear();
		await restoreMaxInput.fill(originalMax);
		await saveValidationSettings(adminPage);
	});

	test("form hides keywords section when ENABLE_KEYWORDS is false", async ({
		adminPage,
		userPage,
	}) => {
		// Arrange - Admin: Disable keywords
		await goToAdminSubmissionSettings(adminPage);
		const enableKeywordsSwitch = adminPage.getByLabel("Enable keywords");
		const wasEnabled = await enableKeywordsSwitch.isChecked();
		if (wasEnabled) {
			await enableKeywordsSwitch.click();
			await saveValidationSettings(adminPage);
		}

		// Act - User: Navigate to form
		await userPage.goto("/submissions/new");

		// Assert - Keywords section hidden
		await expect(
			userPage.getByRole("heading", { name: "Keywords", exact: true })
		).not.toBeVisible();
		await expect(
			userPage.getByText(/relevant keywords/i)
		).not.toBeVisible();
		await expect(
			userPage.locator(".flex.items-center.gap-3").filter({
				hasText: "Keywords",
			})
		).not.toBeVisible();

		// Cleanup: Re-enable keywords
		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Title" })
		).toBeVisible();
		const restoreSwitch = adminPage.getByLabel("Enable keywords");
		const isNowEnabled = await restoreSwitch.isChecked();
		if (!isNowEnabled) {
			await restoreSwitch.click();
			await saveValidationSettings(adminPage);
		}
	});

	test("form respects custom file size limit", async ({
		adminPage,
		userPage,
	}) => {
		// Arrange - Admin: Set ORAL_PRESENTATION to FILE format
		await goToAdminSubmissionTypes(adminPage);
		await adminPage.getByRole("button", { name: /Oral Presentation/i }).first().click();
		await expect(adminPage.getByText("Content Format")).toBeVisible();
		const contentFormatSelect = adminPage.locator("button").filter({ hasText: /Text \(Abstract\)|File Upload/i });
		const currentFormat = await contentFormatSelect.textContent();
		const wasTextFormat = currentFormat?.includes("Text");
		if (wasTextFormat) {
			await contentFormatSelect.click();
			await adminPage.getByRole("option", { name: "File Upload" }).click();
			await adminPage.getByLabel("pdf").check();
			await adminPage.getByRole("button", { name: "Save" }).click();
			await expect(
				adminPage.getByText(/"Oral Presentation" settings saved/i)
			).toBeVisible({ timeout: 5000 });
		}

		// Arrange - Admin: Change MAX_FILE_SIZE_MB to 5
		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Title" })
		).toBeVisible();
		const maxFileSizeInput = adminPage.getByLabel("Max file size (MB)");
		const originalSize = await maxFileSizeInput.inputValue();
		await maxFileSizeInput.clear();
		await maxFileSizeInput.fill("5");
		await saveValidationSettings(adminPage);

		// Act - User: Navigate to form
		await userPage.goto("/submissions/new");

		// Assert - File dropzone shows updated limit
		await expect(userPage.getByText(/up to 5MB/i)).toBeVisible();

		// Cleanup: Restore original file size
		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Title" })
		).toBeVisible();
		const restoreInput = adminPage.getByLabel("Max file size (MB)");
		await restoreInput.clear();
		await restoreInput.fill(originalSize);
		await saveValidationSettings(adminPage);

		// Cleanup: Restore TEXT format if changed
		if (wasTextFormat) {
			await adminPage.reload();
			await adminPage.getByRole("tab", { name: /Submission Types/i }).click();
			await expect(adminPage.getByText("Oral Presentation")).toBeVisible();
			await adminPage.getByRole("button", { name: /Oral Presentation/i }).first().click();
			await expect(adminPage.getByText("Content Format")).toBeVisible();
			const restoreSelect = adminPage.locator("button").filter({ hasText: /Text \(Abstract\)|File Upload/i });
			await restoreSelect.click();
			await adminPage.getByRole("option", { name: "Text (Abstract)" }).click();
			await adminPage.getByRole("button", { name: "Save" }).click();
			await expect(
				adminPage.getByText(/"Oral Presentation" settings saved/i)
			).toBeVisible({ timeout: 5000 });
		}
	});

	test("TEXT format hides file dropzone", async ({
		userPage,
	}) => {
		// Arrange
		await userPage.goto("/submissions/new");

		// Assert
		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();
		await expect(userPage.getByLabel("Abstract")).toBeVisible();
		await expect(userPage.getByText("Document *")).not.toBeVisible();
		await expect(
			userPage.getByText("Drop file or click to upload")
		).not.toBeVisible();
	});

	test("content format strictly determines visible fields", async ({
		adminPage,
		userPage,
	}) => {
		// Arrange - Admin: Set ORAL_PRESENTATION to FILE format
		await goToAdminSubmissionTypes(adminPage);
		await adminPage.getByRole("button", { name: /Oral Presentation/i }).first().click();
		await expect(adminPage.getByText("Content Format")).toBeVisible();
		const contentFormatSelect = adminPage.locator("button").filter({ hasText: /Text \(Abstract\)|File Upload/i });
		const currentFormat = await contentFormatSelect.textContent();
		const wasTextFormat = currentFormat?.includes("Text");
		if (wasTextFormat) {
			await contentFormatSelect.click();
			await adminPage.getByRole("option", { name: "File Upload" }).click();
			await adminPage.getByLabel("pdf").check();
			await adminPage.getByRole("button", { name: "Save" }).click();
			await expect(
				adminPage.getByText(/"Oral Presentation" settings saved/i)
			).toBeVisible({ timeout: 5000 });
		}

		// Act - User: Navigate to form
		await userPage.goto("/submissions/new");

		// Assert - FILE format shows upload, not text area
		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();
		await expect(userPage.getByText("Document *")).toBeVisible();
		await expect(
			userPage.getByText("Drop file or click to upload")
		).toBeVisible();
		await expect(userPage.getByLabel("Abstract")).not.toBeVisible();

		// Cleanup: Restore TEXT format
		if (wasTextFormat) {
			await adminPage.reload();
			await adminPage.getByRole("tab", { name: /Submission Types/i }).click();
			await expect(adminPage.getByText("Oral Presentation")).toBeVisible();
			await adminPage.getByRole("button", { name: /Oral Presentation/i }).first().click();
			await expect(adminPage.getByText("Content Format")).toBeVisible();
			const restoreSelect = adminPage.locator("button").filter({ hasText: /Text \(Abstract\)|File Upload/i });
			await restoreSelect.click();
			await adminPage.getByRole("option", { name: "Text (Abstract)" }).click();
			await adminPage.getByRole("button", { name: "Save" }).click();
			await expect(
				adminPage.getByText(/"Oral Presentation" settings saved/i)
			).toBeVisible({ timeout: 5000 });
		}

		// Assert - After restore: TEXT format shows text area, not file dropzone
		await userPage.reload();
		await expect(userPage.getByLabel("Abstract")).toBeVisible({ timeout: 10000 });
		await expect(userPage.getByText("Document *")).not.toBeVisible();
	});
});
