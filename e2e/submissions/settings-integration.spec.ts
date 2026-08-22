import { expect, type BrowserContext, type Page } from "@playwright/test";
import { test as base } from "../helpers/base-fixtures";
import { baseUrlFor } from "../../playwright.config";
import { dismissViteOverlay } from "../helpers/page-setup";

// Per-worker auth file + server URL (this spec builds its own browser contexts).
const workerAuth = (role: string, parallelIndex: number) =>
	`e2e/.auth/${role}-${parallelIndex}.json`;

/**
 * Integration tests verifying that admin settings are properly reflected in the submission form.
 * These tests use two browser contexts: admin (to change settings) and user (to verify form).
 */

interface SettingsIntegrationFixtures {
	adminContext: BrowserContext;
	adminPage: Page;
	userContext: BrowserContext;
	userPage: Page;
}

const test = base.extend<SettingsIntegrationFixtures>({
	adminContext: async ({ browser }, use, testInfo) => {
		const context = await browser.newContext({
			baseURL: baseUrlFor(testInfo.parallelIndex),
			storageState: workerAuth("admin", testInfo.parallelIndex),
		});
		await use(context);
		await context.close();
	},
	adminPage: async ({ adminContext }, use) => {
		const page = await adminContext.newPage();
		await dismissViteOverlay(page);
		await use(page);
		await page.close();
	},
	userContext: async ({ browser }, use, testInfo) => {
		const context = await browser.newContext({
			baseURL: baseUrlFor(testInfo.parallelIndex),
			storageState: workerAuth("user", testInfo.parallelIndex),
		});
		await use(context);
		await context.close();
	},
	userPage: async ({ userContext }, use) => {
		const page = await userContext.newPage();
		await dismissViteOverlay(page);
		await use(page);
		await page.close();
	},
});

async function goToAdminSubmissionSettings(adminPage: Page) {
	await adminPage.goto("/admin/settings");
	await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
	await expect(adminPage.getByRole("heading", { name: "Content Validation" })).toBeVisible();
}

async function goToAdminSubmissionTypes(adminPage: Page) {
	await adminPage.goto("/admin/settings");
	await adminPage.getByRole("tab", { name: /Submission Types/i }).click();
	await expect(adminPage.getByText("Oral Presentation")).toBeVisible();
}

async function openSubmissionTypeForEditing(adminPage: Page, typeName: RegExp) {
	await goToAdminSubmissionTypes(adminPage);
	await adminPage.getByRole("button", { name: typeName }).first().click();
	await expect(adminPage.getByText("Content Format")).toBeVisible();
}

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
	test.afterAll(async ({ browser }, testInfo) => {
		const context = await browser.newContext({
			baseURL: baseUrlFor(testInfo.parallelIndex),
			storageState: workerAuth("admin", testInfo.parallelIndex),
		});
		const page = await context.newPage();

		try {
			await page.goto("/admin/settings");
			await page.getByRole("tab", { name: /Submission Types/i }).click();
			await expect(page.getByText("Oral Presentation")).toBeVisible();

			await page.getByRole("button", { name: /Poster/i }).first().click();
			await expect(page.getByText("Content Format")).toBeVisible();
			const posterSwitch = page.getByRole("switch").first();
			if ((await posterSwitch.getAttribute("aria-checked")) === "false") {
				await posterSwitch.click();
				await page.getByRole("button", { name: "Save" }).click();
				await expect(page.getByText(/"Poster" settings saved/i)).toBeVisible({ timeout: 5000 });
			}

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

			await page.reload();
			await page.getByRole("tab", { name: /Submissions$/i }).click();
			await expect(page.getByRole("heading", { name: "Content Validation" })).toBeVisible();

			const keywordsSwitch = page.getByRole("switch", { name: "Enable keywords" });
			if (!(await keywordsSwitch.isChecked())) {
				await keywordsSwitch.click();
			}

			const minKeywords = page.getByLabel("Min keywords");
			const maxKeywords = page.getByLabel("Max keywords");
			await minKeywords.clear();
			await minKeywords.fill("3");
			await maxKeywords.clear();
			await maxKeywords.fill("5");

			const abstractMin = page.getByLabel("Min length (characters)").nth(1);
			await abstractMin.clear();
			await abstractMin.fill("500");

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
		await openSubmissionTypeForEditing(adminPage, /Poster/i);
		const activeSwitch = adminPage.getByRole("switch").first();
		const wasActive = await activeSwitch.getAttribute("aria-checked");
		if (wasActive === "true") {
			await activeSwitch.click();
			await adminPage.getByRole("button", { name: "Save" }).click();
			await expect(
				adminPage.getByText(/"Poster" settings saved/i)
			).toBeVisible({ timeout: 5000 });
		}

		await userPage.goto("/submissions/new");

		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();
		await expect(
			userPage.getByRole("button", { name: /Poster/i })
		).not.toBeVisible();

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
		await goToAdminSubmissionSettings(adminPage);
		const allMinInputs = adminPage.getByLabel("Min length (characters)");
		const abstractMinInput = allMinInputs.nth(1);
		const originalMin = await abstractMinInput.inputValue();
		await abstractMinInput.clear();
		await abstractMinInput.fill("200");
		await saveValidationSettings(adminPage);

		await userPage.goto("/submissions/new");
		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();

		await userPage.getByLabel("Abstract").fill("Short content");
		await userPage.getByLabel("Abstract").blur();
		await userPage.getByRole("button", { name: "Submit" }).click();
		await expect(
			userPage.getByText(/at least 200 characters/i)
		).toBeVisible({ timeout: 10000 });

		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Content Validation" })
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

		await userPage.goto("/submissions/new");

		await expect(userPage.getByText(/Add 2-4 relevant keywords/i)).toBeVisible({ timeout: 10000 });

		await adminPage.goto("/admin/settings");
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Content Validation" })
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
		await goToAdminSubmissionSettings(adminPage);
		const enableKeywordsSwitch = adminPage.getByRole("switch", { name: "Enable keywords" });
		const wasEnabled = await enableKeywordsSwitch.isChecked();
		if (wasEnabled) {
			await enableKeywordsSwitch.click();
			await saveValidationSettings(adminPage);
		}

		await expect(async () => {
			await userPage.goto("/submissions/new");
			await expect(
				userPage.getByRole("heading", { name: "Keywords", exact: true })
			).not.toBeVisible();
			await expect(
				userPage.getByText(/relevant keywords/i)
			).not.toBeVisible();
			await expect(
				userPage.getByTestId("progress-row-keywords")
			).not.toBeVisible();
		}).toPass({ timeout: 15000 });

		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submissions$/i }).click();
		await expect(
			adminPage.getByRole("heading", { name: "Content Validation" })
		).toBeVisible();
		const restoreSwitch = adminPage.getByRole("switch", { name: "Enable keywords" });
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
		await openSubmissionTypeForEditing(adminPage, /Oral Presentation/i);
		const contentFormatSelect = adminPage.locator("button").filter({ hasText: /Text \(Abstract\)|File Upload/i });
		const currentFormat = await contentFormatSelect.textContent();
		const wasTextFormat = currentFormat?.includes("Text");
		if (wasTextFormat) {
			await contentFormatSelect.click();
			await adminPage.getByRole("option", { name: "File Upload" }).click();
			await adminPage.getByRole("radio", { name: "pdf" }).check();
		}

		const maxFileSizeInput = adminPage.getByLabel("Max file size (MB)");
		const originalSize = await maxFileSizeInput.inputValue();
		await maxFileSizeInput.clear();
		await maxFileSizeInput.fill("5");
		await adminPage.getByRole("button", { name: "Save" }).click();
		await expect(
			adminPage.getByText(/"Oral Presentation" settings saved/i)
		).toBeVisible({ timeout: 5000 });

		await userPage.goto("/submissions/new");
		await userPage.getByRole("button", { name: /Oral Presentation/i }).click();

		await expect(userPage.getByText(/up to 5MB/i)).toBeVisible();

		// Cleanup: restore the original size (and TEXT format if we changed it),
		// all within the same accordion while the FILE block is still visible.
		await adminPage.reload();
		await adminPage.getByRole("tab", { name: /Submission Types/i }).click();
		await expect(adminPage.getByText("Oral Presentation")).toBeVisible();
		await adminPage.getByRole("button", { name: /Oral Presentation/i }).first().click();
		await expect(adminPage.getByText("Content Format")).toBeVisible();
		const restoreInput = adminPage.getByLabel("Max file size (MB)");
		await restoreInput.clear();
		await restoreInput.fill(originalSize || "10");
		if (wasTextFormat) {
			const restoreSelect = adminPage.locator("button").filter({ hasText: /Text \(Abstract\)|File Upload/i });
			await restoreSelect.click();
			await adminPage.getByRole("option", { name: "Text (Abstract)" }).click();
		}
		await adminPage.getByRole("button", { name: "Save" }).click();
		await expect(
			adminPage.getByText(/"Oral Presentation" settings saved/i)
		).toBeVisible({ timeout: 5000 });
	});

	test("TEXT format hides file dropzone", async ({
		userPage,
	}) => {
		await userPage.goto("/submissions/new");

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
		await openSubmissionTypeForEditing(adminPage, /Oral Presentation/i);
		const contentFormatSelect = adminPage.locator("button").filter({ hasText: /Text \(Abstract\)|File Upload/i });
		const currentFormat = await contentFormatSelect.textContent();
		const wasTextFormat = currentFormat?.includes("Text");
		if (wasTextFormat) {
			await contentFormatSelect.click();
			await adminPage.getByRole("option", { name: "File Upload" }).click();
			await adminPage.getByRole("radio", { name: "pdf" }).check();
			await adminPage.getByRole("button", { name: "Save" }).click();
			await expect(
				adminPage.getByText(/"Oral Presentation" settings saved/i)
			).toBeVisible({ timeout: 5000 });
		}

		await userPage.goto("/submissions/new");

		await expect(
			userPage.getByRole("button", { name: /Oral Presentation/i })
		).toBeVisible();
		await expect(userPage.getByText("Document *")).toBeVisible();
		await expect(
			userPage.getByText("Drop file or click to upload")
		).toBeVisible();
		await expect(userPage.getByLabel("Abstract")).not.toBeVisible();

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

		await userPage.reload();
		await expect(userPage.getByLabel("Abstract")).toBeVisible({ timeout: 10000 });
		await expect(userPage.getByText("Document *")).not.toBeVisible();
	});
});
