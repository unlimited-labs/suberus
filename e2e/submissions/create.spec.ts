import {
	test,
	expect,
	VALID_SUBMISSION,
	TEST_USER,
} from "./fixtures";

// Note: Authentication is handled via storageState in playwright.config.ts

test.describe("Submission Form", () => {

	test("displays submission form", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();

		// Assert
		await expect(
			submissionPage.page
				.getByRole("heading", { name: "New Submission" })
				.first(),
		).toBeVisible();
		await expect(submissionPage.titleInput).toBeVisible();
		await expect(submissionPage.contentInput).toBeVisible();
		await expect(submissionPage.submitButton).toBeVisible();
	});

	test("auto-fills first author with logged-in user data", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.page.waitForLoadState("networkidle");
		const authorsHeading = submissionPage.page.getByRole("heading", { name: "Authors" });
		await authorsHeading.scrollIntoViewIfNeeded();
		await expect(authorsHeading).toBeVisible({ timeout: 10000 });
		const firstNameInput = submissionPage.page.locator("#author-0-firstName");
		const lastNameInput = submissionPage.page.locator("#author-0-lastName");
		const emailInput = submissionPage.page.locator("#author-0-email");
		await expect(firstNameInput).toBeVisible({ timeout: 10000 });

		// Assert
		await expect(firstNameInput).toHaveValue(TEST_USER.firstName, {
			timeout: 15000,
		});
		await expect(lastNameInput).toHaveValue(TEST_USER.lastName);
		await expect(emailInput).toHaveValue(TEST_USER.email);
		const affiliationInput = submissionPage.page.getByPlaceholder(
			"Type affiliation...",
		);
		await expect(affiliationInput).toHaveValue("Test University", {
			timeout: 15000,
		});
	});

	test("can select submission type", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		const oralButton = submissionPage.getSubmissionTypeButton("Oral Presentation");
		await expect(oralButton).toHaveClass(/border-primary/);

		// Act
		await submissionPage.selectType("POSTER");

		// Assert
		const posterButton = submissionPage.getSubmissionTypeButton("Poster");
		await expect(posterButton).toHaveClass(/border-primary/);
	});

	test("shows Full Paper option with file upload badge", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();

		// Assert
		const fullPaperButton = submissionPage.getSubmissionTypeButton("Full Paper");
		await expect(fullPaperButton).toBeVisible();
		await expect(fullPaperButton).toContainText("File upload");
	});

	test("can fill title and content", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();

		// Act
		await submissionPage.fillTitle("Test Title");
		await submissionPage.fillContent("Test content that is long enough");

		// Assert
		await expect(submissionPage.titleInput).toHaveValue("Test Title");
		await expect(submissionPage.contentInput).toHaveValue(
			"Test content that is long enough",
		);
	});

	test("can add keywords", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();

		// Act
		await submissionPage.addKeyword("keyword1");
		await submissionPage.addKeyword("keyword2");

		// Assert
		await expect(submissionPage.page.locator("text=keyword1")).toBeVisible();
		await expect(submissionPage.page.locator("text=keyword2")).toBeVisible();
	});

	test("can add keywords with comma tokenization", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();
		const keywordInput = submissionPage.getKeywordsSection().getByRole("textbox");

		// Act
		await keywordInput.fill("first, second,");

		// Assert
		await expect(submissionPage.page.locator("text=first")).toBeVisible();
		await expect(submissionPage.page.locator("text=second")).toBeVisible();

		// Act
		await keywordInput.fill("third");
		await keywordInput.press("Enter");

		// Assert
		await expect(submissionPage.page.locator("text=third")).toBeVisible();
	});

	test("adds keyword on blur (without comma or Enter)", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();
		const keywordInput = submissionPage.getKeywordsSection().getByRole("textbox");

		// Act
		await keywordInput.fill("singlekeyword");
		await submissionPage.titleInput.click();

		// Assert
		await expect(
			submissionPage.page.locator("text=singlekeyword"),
		).toBeVisible();
	});

	test("can add additional author", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		await expect(
			submissionPage.page.locator("#author-0-firstName"),
		).toBeVisible();

		// Act
		await submissionPage.addAuthor();

		// Assert
		await expect(
			submissionPage.page.locator("#author-1-firstName"),
		).toBeVisible();
	});

	test("shows progress indicators on desktop", async (
		{ submissionPage },
		testInfo,
	) => {
		// Skip on mobile - progress sidebar is hidden
		if (testInfo.project.name === "mobile-user") {
			test.skip();
			return;
		}

		// Arrange
		await submissionPage.goto();

		// Assert
		const progressSection = submissionPage.page.getByText("Progress");
		await expect(progressSection).toBeVisible();
	});

	test("submits form successfully and redirects", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(VALID_SUBMISSION);

		// Act
		await submissionPage.submit();

		// Assert
		await submissionPage.page.waitForURL(/\/submissions\/[a-f0-9-]+/, {
			timeout: 15000,
		});
		await expect(
			submissionPage.page.getByText("Submission created successfully"),
		).toBeVisible();
	});

	test("shows error for short content", async ({ submissionPage }, testInfo) => {
		// Skip on mobile - toast positioning may differ
		if (testInfo.project.name.includes("mobile")) {
			test.skip();
			return;
		}

		// Arrange
		await submissionPage.goto();
		await submissionPage.selectType("ABSTRACT");
		await submissionPage.fillTitle("Valid title here");
		await submissionPage.fillContent("Too short");
		await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);
		await submissionPage.addKeyword("keyword1");
		await submissionPage.addKeyword("keyword2");
		await submissionPage.addKeyword("keyword3");

		// Act
		await submissionPage.submit();

		// Assert
		await expect(
			submissionPage.page.getByText(/at least 500 characters/i),
		).toBeVisible({ timeout: 10000 });
	});

	test("shows character count for content", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();

		// Act
		await submissionPage.fillContent("Hello World");

		// Assert
		await expect(
			submissionPage.page.getByText(/11 \/ \d+-\d+ characters/),
		).toBeVisible();
	});

	test("shows file dropzone for FILE format type", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();

		// Act
		await submissionPage.selectType("FULL_PAPER");

		// Assert
		await expect(submissionPage.contentInput).not.toBeVisible({ timeout: 5000 });
		await expect(
			submissionPage.page.getByText("Drop file or click to upload"),
		).toBeVisible();
		await expect(submissionPage.page.getByText("Document *")).toBeVisible();
		await expect(
			submissionPage.page.getByText(/Accepted formats:.*PDF.*DOC.*DOCX/i),
		).toBeVisible();
	});

	test("hides file dropzone for TEXT format", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();

		// Assert
		await expect(submissionPage.contentInput).toBeVisible();
		await expect(
			submissionPage.page.getByText("Drop file or click to upload"),
		).not.toBeVisible();
		await expect(submissionPage.page.getByText(/^Document/)).not.toBeVisible();
	});

	test("switches content fields when changing type", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();
		await expect(submissionPage.contentInput).toBeVisible();

		// Act
		await submissionPage.selectType("FULL_PAPER");

		// Assert
		await expect(submissionPage.contentInput).not.toBeVisible({ timeout: 5000 });
		await expect(
			submissionPage.page.getByText("Drop file or click to upload"),
		).toBeVisible();

		// Act
		await submissionPage.selectType("POSTER");

		// Assert
		await expect(submissionPage.contentInput).toBeVisible({ timeout: 5000 });
	});
});
