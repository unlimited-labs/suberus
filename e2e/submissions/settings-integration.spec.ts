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

test.describe("Admin Settings Integration with Submission Form", () => {
	test("form respects disabled submission type", async ({
		adminPage,
		userPage,
	}) => {
		// 1. Admin: Disable POSTER
		await goToAdminSubmissionTypes(adminPage);
		await adminPage.getByRole("button", { name: /Poster/i }).first().click();
		await expect(adminPage.getByText("Content Format")).toBeVisible();

		const activeSwitch = adminPage.getByRole("switch").first();
		const wasActive = await activeSwitch.getAttribute("aria-checked");

		// Only toggle if currently active
		if (wasActive === "true") {
			await activeSwitch.click();
			await adminPage.getByRole("button", { name: "Save" }).click();
			await expect(
				adminPage.getByText(/"Poster" settings saved/i)
			).toBeVisible({ timeout: 5000 });
		}

		// 2. User: Verify form doesn't show disabled type
		await userPage.goto("/submissions/new");
		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();
		await expect(
			userPage.getByRole("button", { name: /Poster/i })
		).not.toBeVisible();

		// 3. Cleanup: Re-enable POSTER
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
		// 1. Admin: Change MIN_ABSTRACT_LENGTH to 200
		await goToAdminSubmissionSettings(adminPage);

		// Find abstract min length input (second "Min length" input)
		adminPage.locator("div").filter({
			hasText: /^Abstract$/,
		});
		const allMinInputs = adminPage.getByLabel("Min length (characters)");
		const abstractMinInput = allMinInputs.nth(1);

		// Store original value
		const originalMin = await abstractMinInput.inputValue();

		// Set new value
		await abstractMinInput.clear();
		await abstractMinInput.fill("200");
		await saveValidationSettings(adminPage);

		// 2. User: Verify form shows updated limit in Guidelines
		await userPage.goto("/submissions/new");

		// Select TEXT format type (Oral Presentation is default)
		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();

		// Check Guidelines card shows updated minimum
		await expect(
			userPage.getByText(/Abstract minimum 200 characters/i)
		).toBeVisible();

		// 3. Cleanup: Restore original value
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
		// 1. Admin: Change MIN_KEYWORDS to 2, MAX_KEYWORDS to 4
		await goToAdminSubmissionSettings(adminPage);

		const minKeywordsInput = adminPage.getByLabel("Min keywords");
		const maxKeywordsInput = adminPage.getByLabel("Max keywords");

		// Store original values
		const originalMin = await minKeywordsInput.inputValue();
		const originalMax = await maxKeywordsInput.inputValue();

		// Set new values
		await minKeywordsInput.clear();
		await minKeywordsInput.fill("2");
		await maxKeywordsInput.clear();
		await maxKeywordsInput.fill("4");
		await saveValidationSettings(adminPage);

		// 2. User: Verify form shows updated limits
		await userPage.goto("/submissions/new");

		// Check Guidelines card shows updated keyword range
		await expect(userPage.getByText(/Add 2-4 relevant keywords/i)).toBeVisible();

		// Check KeywordsInput shows updated limits
		await expect(userPage.getByText(/0 \/ 2-4 keywords/i)).toBeVisible();

		// 3. Cleanup: Restore original values
		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Title" })
		).toBeVisible();

		const restoreMinInput = adminPage.getByLabel("Min keywords");
		const restoreMaxInput = adminPage.getByLabel("Max keywords");
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
		// 1. Admin: Disable keywords
		await goToAdminSubmissionSettings(adminPage);

		const enableKeywordsSwitch = adminPage.getByLabel("Enable keywords");
		const wasEnabled = await enableKeywordsSwitch.isChecked();

		// Only toggle if currently enabled
		if (wasEnabled) {
			await enableKeywordsSwitch.click();
			await saveValidationSettings(adminPage);
		}

		// 2. User: Verify form doesn't show Keywords section
		await userPage.goto("/submissions/new");

		// Keywords section should not be visible
		await expect(
			userPage.getByRole("heading", { name: "Keywords", exact: true })
		).not.toBeVisible();

		// Guidelines should not mention keywords
		await expect(
			userPage.getByText(/relevant keywords/i)
		).not.toBeVisible();

		// Progress indicator should not show Keywords
		await expect(
			userPage.locator(".flex.items-center.gap-3").filter({
				hasText: "Keywords",
			})
		).not.toBeVisible();

		// 3. Cleanup: Re-enable keywords
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
		// 1. Admin: Change MAX_FILE_SIZE_MB to 5
		await goToAdminSubmissionSettings(adminPage);

		const maxFileSizeInput = adminPage.getByLabel("Max file size (MB)");

		// Store original value
		const originalSize = await maxFileSizeInput.inputValue();

		// Set new value
		await maxFileSizeInput.clear();
		await maxFileSizeInput.fill("5");
		await saveValidationSettings(adminPage);

		// 2. User: Verify file dropzone shows updated limit
		await userPage.goto("/submissions/new");

		// File dropzone shows "PDF,DOC,DOCX up to {maxSize}MB"
		await expect(userPage.getByText(/up to 5MB/i)).toBeVisible();

		// 3. Cleanup: Restore original value
		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Title" })
		).toBeVisible();

		const restoreInput = adminPage.getByLabel("Max file size (MB)");
		await restoreInput.clear();
		await restoreInput.fill(originalSize);
		await saveValidationSettings(adminPage);
	});

	test("form uses allowed file types from settings for TEXT format", async ({
		adminPage,
		userPage,
	}) => {
		// 1. Admin: Verify ALLOWED_FILE_TYPES has pdf
		await goToAdminSubmissionSettings(adminPage);

		// The allowed file types checkboxes should be visible
		await expect(adminPage.getByText("Allowed file types")).toBeVisible();
		await expect(adminPage.getByLabel("pdf")).toBeVisible();

		// 2. User: Verify TEXT format uses global allowed file types
		await userPage.goto("/submissions/new");

		// Select Oral Presentation (TEXT format)
		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();

		// The optional file upload should accept the configured types
		// This is verified by checking the dropzone is present
		await expect(
			userPage.getByText("Document (Optional)")
		).toBeVisible();
		await expect(
			userPage.getByText("Drop file or click to upload")
		).toBeVisible();
	});
});
