import { test, expect } from "./fixtures"

test.describe("Admin Settings - Submission Types", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		// Arrange
		await adminSettingsPage.goto()
		await adminSettingsPage.switchToTypesTab(testInfo)
	})

	test("displays all three submission types", async ({ page }) => {
		// Assert
		await expect(page.getByText("Oral Presentation")).toBeVisible()
		await expect(page.getByText("Poster")).toBeVisible()
		await expect(page.getByText("Full Paper")).toBeVisible()
	})

	test("shows content format badges", async ({ page }) => {
		// Assert
		const oralButton = page.getByRole("button", { name: /Oral Presentation/i }).first()
		await expect(oralButton).toContainText("TEXT")
		const fullPaperButton = page.getByRole("button", { name: /Full Paper/i }).first()
		await expect(fullPaperButton).toContainText("FILE")
	})

	test("can expand submission type accordion", async ({ adminSettingsPage, page }) => {
		// Act
		await adminSettingsPage.expandSubmissionType("Oral Presentation")

		// Assert
		await expect(page.getByText("Content Format")).toBeVisible()
		await expect(page.getByText("Min reviewers")).toBeVisible()
		await expect(page.getByText("Review mode")).toBeVisible()
	})

	test("shows file extensions checkboxes for FILE format", async ({ adminSettingsPage, page }) => {
		// Act
		await adminSettingsPage.expandSubmissionType("Full Paper")

		// Assert
		await expect(page.getByText("Allowed file extensions")).toBeVisible()
		await expect(page.getByText("pdf", { exact: true })).toBeVisible()
		await expect(page.getByText("doc", { exact: true })).toBeVisible()
		await expect(page.getByText("docx", { exact: true })).toBeVisible()
	})

	test("can change content format", async ({ adminSettingsPage, page }) => {
		// Arrange
		await adminSettingsPage.expandSubmissionType("Poster")

		// Act
		await adminSettingsPage.selectContentFormat("File Upload")

		// Assert
		await expect(page.getByText("Allowed file extensions")).toBeVisible({ timeout: 5000 })
	})

	test("can toggle active state", async ({ adminSettingsPage }) => {
		// Arrange
		await adminSettingsPage.expandSubmissionType("Poster")

		// Act
		const activeSwitch = await adminSettingsPage.toggleActiveSwitch()

		// Assert
		await expect(activeSwitch).toHaveAttribute("aria-checked", "false")
	})

	test("can save submission type settings", async ({ adminSettingsPage, page }) => {
		// Arrange
		await adminSettingsPage.expandSubmissionType("Oral Presentation")
		const requiredReviewersInput = adminSettingsPage.getRequiredReviewersInput()

		// Act
		await requiredReviewersInput.clear()
		await requiredReviewersInput.fill("3")
		await adminSettingsPage.saveSubmissionType()

		// Assert
		await expect(
			page.getByText(/"Oral Presentation" settings saved/i),
		).toBeVisible({ timeout: 5000 })
	})

	test("validates FILE format requires at least one extension", async ({ adminSettingsPage, page }) => {
		// Arrange
		await adminSettingsPage.expandSubmissionType("Full Paper")
		await expect(page.getByText("Allowed file extensions")).toBeVisible()

		// Act
		await adminSettingsPage.getFileExtensionCheckbox("pdf").uncheck()
		await adminSettingsPage.getFileExtensionCheckbox("doc").uncheck()
		await adminSettingsPage.getFileExtensionCheckbox("docx").uncheck()

		// Assert
		await expect(
			page.getByText("At least one extension is required"),
		).toBeVisible()

		// Act
		await adminSettingsPage.saveSubmissionType()

		// Assert
		await expect(
			page.getByText(/requires at least one allowed extension/i),
		).toBeVisible({ timeout: 5000 })
	})
})

test.describe("Admin Settings - Tab Navigation", () => {
	test("defaults to conference tab without query param", async ({ adminSettingsPage, page }) => {
		// Act
		await adminSettingsPage.goto()

		// Assert
		await expect(page.getByRole("heading", { name: "Basic Information" })).toBeVisible()
		await expect(page).toHaveURL("/admin/settings")
	})

	test("navigates to submissions tab via query param", async ({ page }) => {
		// Act
		await page.goto("/admin/settings?tab=submissions")

		// Assert
		await expect(page.getByRole("heading", { name: "Content Validation" })).toBeVisible()
		await expect(page).toHaveURL("/admin/settings?tab=submissions")
	})

	test("updates URL when switching tabs", async ({ adminSettingsPage, page }, testInfo) => {
		// Arrange
		await adminSettingsPage.goto()

		// Act
		await adminSettingsPage.switchToSubmissionsTab(testInfo)

		// Assert
		await expect(page).toHaveURL("/admin/settings?tab=submissions")
	})

	test("preserves tab state on refresh", async ({ page }) => {
		// Arrange
		await page.goto("/admin/settings?tab=submissions")
		await expect(page.getByRole("heading", { name: "Content Validation" })).toBeVisible()

		// Act
		await page.reload()

		// Assert
		await expect(page.getByRole("heading", { name: "Content Validation" })).toBeVisible()
		await expect(page).toHaveURL("/admin/settings?tab=submissions")
	})

	test("handles invalid tab param gracefully", async ({ page }) => {
		// Act
		await page.goto("/admin/settings?tab=invalid")

		// Assert - invalid tabs show the tab but may not have matching content
		// The URL preserves the invalid tab parameter
		await expect(page).toHaveURL("/admin/settings?tab=invalid")
	})
})

test.describe("Admin Settings - Submission Validation", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		// Arrange
		await adminSettingsPage.goto()
		await adminSettingsPage.switchToSubmissionsTab(testInfo)
	})

	test("displays merged Content Validation section", async ({ page }) => {
		// Assert
		await expect(page.getByRole("heading", { name: "Content Validation" })).toBeVisible()
		await expect(page.getByText("Title, abstract and keyword restrictions")).toBeVisible()
	})

	test("displays all validation fields in single section", async ({ page, adminSettingsPage }) => {
		// Assert - Title, Abstract, Keywords all in one section
		// Check by unique labels instead of generic text
		await expect(page.getByLabel("Min length (characters)").first()).toBeVisible()
		await expect(page.getByText("For TEXT format submissions")).toBeVisible()
		await expect(adminSettingsPage.getEnableKeywordsSwitch()).toBeVisible()
		await expect(page.getByRole("heading", { name: "Files" })).toBeVisible()
	})

	test("shows title length inputs", async ({ adminSettingsPage }) => {
		// Assert
		await expect(adminSettingsPage.getMinLengthInput(0)).toBeVisible()
		await expect(adminSettingsPage.getMaxLengthInput(0)).toBeVisible()
	})

	test("shows abstract length inputs", async ({ adminSettingsPage }) => {
		// Assert - now part of Content Validation section, check inputs exist
		await expect(adminSettingsPage.getMinLengthInput(1)).toBeVisible()
		await expect(adminSettingsPage.getMaxLengthInput(1)).toBeVisible()
	})

	test("shows keywords min/max inputs when enabled", async ({ adminSettingsPage }, testInfo) => {
		// Skip on mobile - layout differs and inputs may need scrolling
		if (testInfo.project.name === "mobile-admin") {
			test.skip()
			return
		}

		// Assert
		await expect(adminSettingsPage.getMinKeywordsInput()).toBeVisible()
		await expect(adminSettingsPage.getMaxKeywordsInput()).toBeVisible()
	})

	test("can toggle keywords feature", async ({ adminSettingsPage }) => {
		// Arrange
		const enableKeywordsSwitch = adminSettingsPage.getEnableKeywordsSwitch()
		await expect(enableKeywordsSwitch).toBeVisible()
		const isChecked = await enableKeywordsSwitch.isChecked()

		// Act
		await enableKeywordsSwitch.click()

		// Assert
		const newState = await enableKeywordsSwitch.isChecked()
		expect(newState).not.toBe(isChecked)
	})

	test("shows error when min exceeds max for title", async ({ adminSettingsPage, page }) => {
		// Arrange
		const minTitleInput = adminSettingsPage.getMinLengthInput(0)
		const maxTitleInput = adminSettingsPage.getMaxLengthInput(0)

		// Act
		await minTitleInput.clear()
		await minTitleInput.fill("300")
		await maxTitleInput.clear()
		await maxTitleInput.fill("100")

		// Assert
		await expect(page.getByText("Min length cannot exceed max length")).toBeVisible()
	})

	test("shows error when min exceeds max for keywords", async ({ adminSettingsPage, page }, testInfo) => {
		// Skip on mobile - layout differs and inputs may need scrolling
		if (testInfo.project.name === "mobile-admin") {
			test.skip()
			return
		}

		// Arrange
		const minKeywordsInput = adminSettingsPage.getMinKeywordsInput()
		const maxKeywordsInput = adminSettingsPage.getMaxKeywordsInput()

		// Act
		await minKeywordsInput.clear()
		await minKeywordsInput.fill("10")
		await maxKeywordsInput.clear()
		await maxKeywordsInput.fill("3")

		// Assert
		await expect(page.getByText("Min keywords cannot exceed max keywords")).toBeVisible()
	})

	test("can save validation settings", async ({ adminSettingsPage, page }) => {
		// Arrange
		const minTitleInput = adminSettingsPage.getMinLengthInput(0)

		// Act
		await minTitleInput.clear()
		await minTitleInput.fill("15")
		await adminSettingsPage.saveValidationSettings()

		// Assert
		await expect(page.getByText("Submission settings saved")).toBeVisible({ timeout: 5000 })
	})

	test("shows file settings", async ({ adminSettingsPage, page }) => {
		// Assert
		await expect(adminSettingsPage.getMaxFileSizeInput()).toBeVisible()
		await expect(page.getByText("Allowed file types")).toBeVisible()
	})

	test("does not show max authors setting", async ({ page }) => {
		// Assert - maxAuthors removed
		await expect(page.getByLabel("Max number of authors")).not.toBeVisible()
	})

	test("uses markdown list syntax in guidelines placeholder", async ({ page }) => {
		// Arrange
		await page.getByRole("heading", { name: "Submission Guidelines" }).scrollIntoViewIfNeeded()

		// Assert - should use "- " not "• "
		const textarea = page.locator("textarea").filter({ hasText: /Title should be concise/ })
		await expect(textarea).toHaveAttribute("placeholder", /^- /)
	})
})
