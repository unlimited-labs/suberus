import {
	test,
	expect,
	loginAsTestUser,
	VALID_SUBMISSION,
} from "./fixtures"

test.describe("Submission Form", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsTestUser(page)
	})

	test("displays submission form", async ({ submissionPage }) => {
		await submissionPage.goto()

		// Use first() because there are two headings with same name
		await expect(
			submissionPage.page.getByRole("heading", { name: "New Submission" }).first()
		).toBeVisible()
		await expect(submissionPage.titleInput).toBeVisible()
		await expect(submissionPage.contentInput).toBeVisible()
		await expect(submissionPage.submitButton).toBeVisible()
	})

	test("can select submission type", async ({ submissionPage }) => {
		await submissionPage.goto()

		// Abstract is selected by default
		const abstractButton = submissionPage.page.getByRole("button", {
			name: /Abstract/i,
		})
		await expect(abstractButton).toHaveClass(/border-primary/)

		// Select Poster
		await submissionPage.selectType("POSTER")
		const posterButton = submissionPage.page.getByRole("button", {
			name: /Poster/i,
		})
		await expect(posterButton).toHaveClass(/border-primary/)
	})

	test("can fill title and content", async ({ submissionPage }) => {
		await submissionPage.goto()

		await submissionPage.fillTitle("Test Title")
		await submissionPage.fillContent("Test content that is long enough")

		await expect(submissionPage.titleInput).toHaveValue("Test Title")
		await expect(submissionPage.contentInput).toHaveValue(
			"Test content that is long enough"
		)
	})

	test("can add keywords", async ({ submissionPage }) => {
		await submissionPage.goto()

		await submissionPage.addKeyword("keyword1")
		await submissionPage.addKeyword("keyword2")

		// Check keywords are displayed as badges
		await expect(
			submissionPage.page.locator("text=keyword1")
		).toBeVisible()
		await expect(
			submissionPage.page.locator("text=keyword2")
		).toBeVisible()
	})

	test("can add additional author", async ({ submissionPage }) => {
		await submissionPage.goto()

		// There should be one author initially
		await expect(submissionPage.page.locator("#author-0-firstName")).toBeVisible()

		// Add another author
		await submissionPage.addAuthor()

		// Now there should be two authors
		await expect(submissionPage.page.locator("#author-1-firstName")).toBeVisible()
	})

	test("shows progress indicators on desktop", async ({ submissionPage }, testInfo) => {
		// Skip on mobile - progress sidebar is hidden
		if (testInfo.project.name === "mobile") {
			test.skip()
			return
		}

		await submissionPage.goto()

		// Progress section should be visible (on desktop)
		const progressSection = submissionPage.page.getByText("Progress")
		await expect(progressSection).toBeVisible()
	})

	test("submits form successfully and redirects", async ({ submissionPage }) => {
		await submissionPage.goto()
		await submissionPage.fillCompleteForm(VALID_SUBMISSION)

		await submissionPage.submit()

		// Should redirect to submission detail page
		await submissionPage.page.waitForURL(/\/submissions\/[a-f0-9-]+/, {
			timeout: 15000,
		})

		// Should show success toast
		await expect(
			submissionPage.page.getByText("Submission created successfully")
		).toBeVisible()
	})

	test("shows error for short content", async ({ submissionPage }) => {
		await submissionPage.goto()

		await submissionPage.selectType("ABSTRACT")
		await submissionPage.fillTitle("Valid title here")
		await submissionPage.fillContent("Too short")
		await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0])
		await submissionPage.addKeyword("test")

		await submissionPage.submit()

		// Should show error toast
		await expect(
			submissionPage.page.getByText(/at least 100 characters/i)
		).toBeVisible({ timeout: 10000 })
	})

	test("shows character count for content", async ({ submissionPage }) => {
		await submissionPage.goto()

		await submissionPage.fillContent("Hello World")

		// Should show character count
		await expect(
			submissionPage.page.getByText("11 characters")
		).toBeVisible()
	})
})
