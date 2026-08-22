import { test, expect } from "./fixtures"

test.describe("Admin Settings - Submission Types", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		await adminSettingsPage.goto()
		await adminSettingsPage.switchToTypesTab(testInfo)
	})

	test("displays all three submission types", async ({ page }) => {
		await expect(page.getByText("Oral Presentation")).toBeVisible()
		await expect(page.getByText("Poster")).toBeVisible()
		await expect(page.getByText("Full Paper")).toBeVisible()
	})

	test("shows content format badges", async ({ page }) => {
		const oralButton = page.getByRole("button", { name: /Oral Presentation/i }).first()
		await expect(oralButton).toContainText("TEXT")
		const fullPaperButton = page.getByRole("button", { name: /Full Paper/i }).first()
		await expect(fullPaperButton).toContainText("FILE")
	})

	test("can expand submission type accordion", async ({ adminSettingsPage, page }) => {
		await adminSettingsPage.expandSubmissionType("Oral Presentation")

		await expect(page.getByText("Content Format")).toBeVisible()
		await expect(page.getByText("Required reviewers")).toBeVisible()
		await expect(page.getByText("Review mode")).toBeVisible()
	})

	test("shows file extension radios for FILE format", async ({ adminSettingsPage, page }) => {
		await adminSettingsPage.expandSubmissionType("Full Paper")

		await expect(page.getByText("Allowed file extension", { exact: true })).toBeVisible()
		await expect(adminSettingsPage.getFileExtensionRadio("pdf")).toBeVisible()
		await expect(adminSettingsPage.getFileExtensionRadio("docx")).toBeVisible()
	})

	test("can change content format", async ({ adminSettingsPage, page }) => {
		await adminSettingsPage.expandSubmissionType("Poster")

		await adminSettingsPage.selectContentFormat("File Upload")

		await expect(page.getByText("Allowed file extension", { exact: true })).toBeVisible({ timeout: 5000 })
	})

	test("can toggle active state", async ({ adminSettingsPage }) => {
		await adminSettingsPage.expandSubmissionType("Poster")

		const activeSwitch = await adminSettingsPage.toggleActiveSwitch()

		await expect(activeSwitch).toHaveAttribute("aria-checked", "false")
	})

	test("can save submission type settings", async ({ adminSettingsPage, page }) => {
		await adminSettingsPage.expandSubmissionType("Oral Presentation")
		const requiredReviewersInput = adminSettingsPage.getRequiredReviewersInput()

		await requiredReviewersInput.clear()
		await requiredReviewersInput.fill("3")
		await adminSettingsPage.saveSubmissionType()

		await expect(
			page.getByText(/"Oral Presentation" settings saved/i),
		).toBeVisible({ timeout: 5000 })
	})

	for (const typeName of ["Oral Presentation", "Poster", "Full Paper"] as const) {
		test(`Save button visible in FILE format for ${typeName}`, async ({ adminSettingsPage, page }) => {
			await adminSettingsPage.expandSubmissionType(typeName)

			const formatSelect = adminSettingsPage.getContentFormatSelect()
			const currentFormat = await formatSelect.textContent()
			if (currentFormat?.includes("Text")) {
				await adminSettingsPage.selectContentFormat("File Upload")
				await expect(page.getByText("Allowed file extension", { exact: true })).toBeVisible()
			}

			const saveButton = page.getByRole("button", { name: "Save" })
			await saveButton.scrollIntoViewIfNeeded()
			await expect(saveButton).toBeVisible()
			await expect(saveButton).toBeInViewport()
		})
	}

	test("validates FILE format requires an extension", async ({ adminSettingsPage, page }) => {
		await adminSettingsPage.expandSubmissionType("Poster")
		await adminSettingsPage.selectContentFormat("File Upload")
		await expect(page.getByText("Allowed file extension", { exact: true })).toBeVisible()

		await expect(
			page.getByText("Select an allowed file extension"),
		).toBeVisible()

		await adminSettingsPage.saveSubmissionType()

		await expect(
			page.getByText(/requires at least one allowed extension/i),
		).toBeVisible({ timeout: 5000 })
	})
})

test.describe("Admin Settings - Tab Navigation", () => {
	test("defaults to conference tab without query param", async ({ adminSettingsPage, page }) => {
		await adminSettingsPage.goto()

		await expect(page.getByRole("heading", { name: "Basic Information" })).toBeVisible()
		await expect(page).toHaveURL("/admin/settings")
	})

	test("navigates to submissions tab via query param", async ({ page }) => {
		await page.goto("/admin/settings?tab=submissions")

		await expect(page.getByRole("heading", { name: "Content Validation" })).toBeVisible()
		await expect(page).toHaveURL("/admin/settings?tab=submissions")
	})

	test("updates URL when switching tabs", async ({ adminSettingsPage, page }, testInfo) => {
		await adminSettingsPage.goto()

		await adminSettingsPage.switchToSubmissionsTab(testInfo)

		await expect(page).toHaveURL("/admin/settings?tab=submissions")
	})

	test("preserves tab state on refresh", async ({ page }) => {
		await page.goto("/admin/settings?tab=submissions")
		await expect(page.getByRole("heading", { name: "Content Validation" })).toBeVisible()

		await page.reload()

		await expect(page.getByRole("heading", { name: "Content Validation" })).toBeVisible()
		await expect(page).toHaveURL("/admin/settings?tab=submissions")
	})

	test("handles invalid tab param gracefully", async ({ page }) => {
		await page.goto("/admin/settings?tab=invalid")

		await expect(page).toHaveURL("/admin/settings?tab=invalid")
	})
})

test.describe("Admin Settings - Submission Validation", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		await adminSettingsPage.goto()
		await adminSettingsPage.switchToSubmissionsTab(testInfo)
	})

	test("displays merged Content Validation section", async ({ page }) => {
		await expect(page.getByRole("heading", { name: "Content Validation" })).toBeVisible()
		await expect(page.getByText("Title, abstract and keyword restrictions")).toBeVisible()
	})

	test("displays all validation fields in single section", async ({ page, adminSettingsPage }) => {
		await expect(page.getByLabel("Min length (characters)").first()).toBeVisible()
		await expect(page.getByText("For TEXT format submissions")).toBeVisible()
		await expect(adminSettingsPage.getEnableKeywordsSwitch()).toBeVisible()
	})

	test("shows title length inputs", async ({ adminSettingsPage }) => {
		await expect(adminSettingsPage.getMinLengthInput(0)).toBeVisible()
		await expect(adminSettingsPage.getMaxLengthInput(0)).toBeVisible()
	})

	test("shows abstract length inputs", async ({ adminSettingsPage }) => {
		await expect(adminSettingsPage.getMinLengthInput(1)).toBeVisible()
		await expect(adminSettingsPage.getMaxLengthInput(1)).toBeVisible()
	})

	test("shows keywords min/max inputs when enabled", async ({ adminSettingsPage }, testInfo) => {
		// Skip on mobile - layout differs and inputs may need scrolling
		if (testInfo.project.name === "mobile-admin") {
			test.skip()
			return
		}

		await expect(adminSettingsPage.getMinKeywordsInput()).toBeVisible()
		await expect(adminSettingsPage.getMaxKeywordsInput()).toBeVisible()
	})

	test("can toggle keywords feature", async ({ adminSettingsPage }) => {
		const enableKeywordsSwitch = adminSettingsPage.getEnableKeywordsSwitch()
		await expect(enableKeywordsSwitch).toBeVisible()
		const isChecked = await enableKeywordsSwitch.isChecked()

		await enableKeywordsSwitch.click()

		const newState = await enableKeywordsSwitch.isChecked()
		expect(newState).not.toBe(isChecked)
	})

	test("shows error when min exceeds max for title", async ({ adminSettingsPage, page }) => {
		const minTitleInput = adminSettingsPage.getMinLengthInput(0)
		const maxTitleInput = adminSettingsPage.getMaxLengthInput(0)

		await minTitleInput.clear()
		await minTitleInput.fill("300")
		await maxTitleInput.clear()
		await maxTitleInput.fill("100")

		await expect(page.getByText("Min length cannot exceed max length")).toBeVisible()
	})

	test("shows error when min exceeds max for keywords", async ({ adminSettingsPage, page }, testInfo) => {
		// Skip on mobile - layout differs and inputs may need scrolling
		if (testInfo.project.name === "mobile-admin") {
			test.skip()
			return
		}

		const minKeywordsInput = adminSettingsPage.getMinKeywordsInput()
		const maxKeywordsInput = adminSettingsPage.getMaxKeywordsInput()

		await minKeywordsInput.clear()
		await minKeywordsInput.fill("10")
		await maxKeywordsInput.clear()
		await maxKeywordsInput.fill("3")

		await expect(page.getByText("Min keywords cannot exceed max keywords")).toBeVisible()
	})

	test("can save validation settings", async ({ adminSettingsPage, page }) => {
		const minTitleInput = adminSettingsPage.getMinLengthInput(0)

		await minTitleInput.clear()
		await minTitleInput.fill("15")
		await adminSettingsPage.saveValidationSettings()

		await expect(page.getByText("Submission settings saved")).toBeVisible({ timeout: 5000 })
	})

	test("shows file settings", async ({ adminSettingsPage, page }, testInfo) => {
		await adminSettingsPage.switchToTypesTab(testInfo)
		await adminSettingsPage.expandSubmissionType("Full Paper")

		await expect(adminSettingsPage.getMaxFileSizeInput()).toBeVisible()
		await expect(page.getByText("Allowed file extension", { exact: true })).toBeVisible()
	})

	test("does not show max authors setting", async ({ page }) => {
		await expect(page.getByLabel("Max number of authors")).not.toBeVisible()
	})

	test("uses markdown list syntax in guidelines placeholder", async ({ page }) => {
		await page.getByRole("heading", { name: "Submission Guidelines" }).scrollIntoViewIfNeeded()

		const textarea = page.locator("textarea").filter({ hasText: /Title should be concise/ })
		await expect(textarea).toHaveAttribute("placeholder", /^- /)
	})
})
