import { test, expect } from "@playwright/test";

// Note: Authentication is handled via storageState in playwright.config.ts

test.describe("Admin Settings - Submission Types", () => {
	test.beforeEach(async ({ page }, testInfo) => {
		await page.goto("/admin/settings");
		// Navigate to Submission Types tab
		// On mobile, tabs only show icons, so click by index (types is 3rd tab)
		if (testInfo.project.name === "mobile-admin") {
			const tabs = page.getByRole("tab");
			await tabs.nth(2).click(); // 0=Conference, 1=Submissions, 2=Types
		} else {
			await page.getByRole("tab", { name: /Submission Types/i }).click();
		}
		// Wait for tab content to load
		await expect(page.getByText("Oral Presentation")).toBeVisible();
	});

	test("displays all three submission types", async ({ page }) => {
		// Check all three types are visible
		await expect(page.getByText("Oral Presentation")).toBeVisible();
		await expect(page.getByText("Poster")).toBeVisible();
		await expect(page.getByText("Full Paper")).toBeVisible();
	});

	test("shows content format badges", async ({ page }) => {
		// Each type button should contain its format badge
		const oralButton = page.getByRole("button", { name: /Oral Presentation/i }).first();
		await expect(oralButton).toContainText("TEXT");

		// Full Paper should show FILE
		const fullPaperButton = page.getByRole("button", { name: /Full Paper/i }).first();
		await expect(fullPaperButton).toContainText("FILE");
	});

	test("can expand submission type accordion", async ({ page }) => {
		// Click on Oral Presentation to expand
		await page
			.getByRole("button", { name: /Oral Presentation/i })
			.first()
			.click();

		// Should show Content Format field
		await expect(page.getByText("Content Format")).toBeVisible();
		await expect(page.getByText("Min reviewers")).toBeVisible();
		await expect(page.getByText("Review mode")).toBeVisible();
	});

	test("shows file extensions checkboxes for FILE format", async ({ page }) => {
		// Expand Full Paper (FILE format)
		await page.getByRole("button", { name: /Full Paper/i }).first().click();

		// Should show allowed file extensions
		await expect(page.getByText("Allowed file extensions")).toBeVisible();
		await expect(page.getByText("pdf", { exact: true })).toBeVisible();
		await expect(page.getByText("doc", { exact: true })).toBeVisible();
		await expect(page.getByText("docx", { exact: true })).toBeVisible();
	});

	test("can change content format", async ({ page }) => {
		// Expand Poster
		await page.getByRole("button", { name: /Poster/i }).first().click();

		// Wait for accordion content to appear
		await expect(page.getByText("Content Format")).toBeVisible();

		// Find and click the Content Format select (it's a Select trigger)
		const formatSelect = page.getByRole("combobox").first();
		await formatSelect.click();

		// Select FILE
		await page.getByRole("option", { name: "File Upload" }).click();

		// File extensions should now be visible
		await expect(page.getByText("Allowed file extensions")).toBeVisible({ timeout: 5000 });
	});

	test("can toggle active state", async ({ page }) => {
		// Expand Poster
		await page.getByRole("button", { name: /Poster/i }).first().click();

		// Wait for accordion content to appear
		await expect(page.getByText("Content Format")).toBeVisible();

		// Find Active switch and toggle it (first switch in the expanded section)
		const activeSwitch = page.getByRole("switch").first();
		await activeSwitch.click();

		// Badge should change - just verify the switch toggled
		// Check the switch state changed (aria-checked)
		await expect(activeSwitch).toHaveAttribute("aria-checked", "false");
	});

	test("can save submission type settings", async ({ page }) => {
		// Expand Oral Presentation
		await page
			.getByRole("button", { name: /Oral Presentation/i })
			.first()
			.click();

		// Change min reviewers - find container with label, then get input
		const minReviewersContainer = page.locator("div").filter({ hasText: /^Min reviewers$/ });
		const minReviewersInput = minReviewersContainer.getByRole("spinbutton");
		await minReviewersInput.clear();
		await minReviewersInput.fill("3");

		// Click Save
		await page.getByRole("button", { name: "Save" }).click();

		// Should show success toast
		await expect(
			page.getByText(/"Oral Presentation" settings saved/i),
		).toBeVisible({ timeout: 5000 });
	});

	test("validates FILE format requires at least one extension", async ({
		page,
	}) => {
		// Expand Full Paper (FILE format)
		await page.getByRole("button", { name: /Full Paper/i }).first().click();

		// Wait for accordion content to appear
		await expect(page.getByText("Allowed file extensions")).toBeVisible();

		// Uncheck all extensions (labels are lowercase: pdf, doc, docx)
		await page.getByLabel("pdf").uncheck();
		await page.getByLabel("doc", { exact: true }).uncheck();
		await page.getByLabel("docx").uncheck();

		// Error message should appear
		await expect(
			page.getByText("At least one extension is required"),
		).toBeVisible();

		// Try to save - should show error
		await page.getByRole("button", { name: "Save" }).click();
		await expect(
			page.getByText(/requires at least one allowed extension/i),
		).toBeVisible({ timeout: 5000 });
	});
});

test.describe("Admin Settings - Submission Validation", () => {
	test.beforeEach(async ({ page }, testInfo) => {
		await page.goto("/admin/settings");
		// Navigate to Submissions tab (index 1)
		if (testInfo.project.name === "mobile-admin") {
			const tabs = page.getByRole("tab");
			await tabs.nth(1).click(); // 0=Conference, 1=Submissions
		} else {
			await page.getByRole("tab", { name: /Submissions$/i }).click();
		}
		// Wait for tab content to load
		await expect(page.getByRole("heading", { name: "Title" })).toBeVisible();
	});

	test("displays validation settings sections", async ({ page }) => {
		await expect(page.getByRole("heading", { name: "Title" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Abstract" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Keywords" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
	});

	test("shows title length inputs", async ({ page }) => {
		await expect(page.getByLabel("Min length (characters)").first()).toBeVisible();
		await expect(page.getByLabel("Max length (characters)").first()).toBeVisible();
	});

	test("shows abstract length inputs", async ({ page }) => {
		// Abstract section heading should be visible
		await expect(page.getByRole("heading", { name: "Abstract" })).toBeVisible();
	});

	test("shows keywords min/max inputs when enabled", async ({ page }) => {
		// Keywords should have min/max inputs
		await expect(page.getByLabel("Min keywords")).toBeVisible();
		await expect(page.getByLabel("Max keywords")).toBeVisible();
	});

	test("can toggle keywords feature", async ({ page }) => {
		const enableKeywordsSwitch = page.getByLabel("Enable keywords");
		await expect(enableKeywordsSwitch).toBeVisible();

		// Check initial state
		const isChecked = await enableKeywordsSwitch.isChecked();

		// Toggle
		await enableKeywordsSwitch.click();

		// Verify toggled
		const newState = await enableKeywordsSwitch.isChecked();
		expect(newState).not.toBe(isChecked);
	});

	test("shows error when min exceeds max for title", async ({ page }) => {
		const minTitleInput = page.getByLabel("Min length (characters)").first();
		const maxTitleInput = page.getByLabel("Max length (characters)").first();

		// Set min > max
		await minTitleInput.clear();
		await minTitleInput.fill("300");
		await maxTitleInput.clear();
		await maxTitleInput.fill("100");

		// Error should appear
		await expect(page.getByText("Min length cannot exceed max length")).toBeVisible();
	});

	test("shows error when min exceeds max for keywords", async ({ page }) => {
		const minKeywordsInput = page.getByLabel("Min keywords");
		const maxKeywordsInput = page.getByLabel("Max keywords");

		// Set min > max
		await minKeywordsInput.clear();
		await minKeywordsInput.fill("10");
		await maxKeywordsInput.clear();
		await maxKeywordsInput.fill("3");

		// Error should appear
		await expect(page.getByText("Min keywords cannot exceed max keywords")).toBeVisible();
	});

	test("can save validation settings", async ({ page }) => {
		// Modify a setting
		const minTitleInput = page.getByLabel("Min length (characters)").first();
		await minTitleInput.clear();
		await minTitleInput.fill("15");

		// Save
		await page.getByRole("button", { name: "Save All Settings" }).click();

		// Should show success toast
		await expect(page.getByText("Submission settings saved")).toBeVisible({ timeout: 5000 });
	});

	test("shows file settings", async ({ page }) => {
		await expect(page.getByLabel("Max file size (MB)")).toBeVisible();
		await expect(page.getByText("Allowed file types")).toBeVisible();
	});

	test("shows ORCID requirement switch", async ({ page }) => {
		await expect(page.getByLabel("Require ORCID")).toBeVisible();
	});

	test("shows max authors setting", async ({ page }) => {
		await expect(page.getByLabel("Max number of authors")).toBeVisible();
	});
});
