import { test, expect, VALID_SUBMISSION } from "./fixtures";

test.describe("Form Validation", () => {
	test.describe("Content Validation", () => {
		test("shows error for content too short", async ({ submissionPage }, testInfo) => {
			test.slow(); // Form fill with author + keywords + submit under load
			// Skip on mobile - toast positioning may differ
			if (testInfo.project.name.includes("mobile")) {
				test.skip();
				return;
			}

			// Arrange
			await submissionPage.goto();
			await submissionPage.fillTitle(VALID_SUBMISSION.title);
			await submissionPage.fillContent("This content is too short.");
			await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);
			await submissionPage.addKeyword("test1");
			await submissionPage.addKeyword("test2");
			await submissionPage.addKeyword("test3");

			// Act
			await submissionPage.submit();

			// Assert
			await expect(
				submissionPage.page.getByText(/at least 500 characters/i),
			).toBeVisible({ timeout: 15000 });
		});

		test("does not show character count for content", async ({
			submissionPage,
		}) => {
			// Arrange
			await submissionPage.goto();

			// Act
			await submissionPage.fillContent("Test content here");

			// Assert
			await expect(
				submissionPage.page.getByText(/17 \/ \d+-\d+ characters/),
			).not.toBeVisible();
		});
	});

	test.describe("Keywords Validation", () => {
		test("shows minimum keywords requirement", async ({ submissionPage }) => {
			// Arrange
			await submissionPage.goto();

			// Assert - Keywords section visible with heading and input
			await expect(
				submissionPage.page.getByRole("heading", { name: "Keywords" }),
			).toBeVisible();
			const keywordsSection = submissionPage.getKeywordsSection();
			await expect(keywordsSection.getByRole("textbox")).toBeVisible();
		});

		test("updates keyword count as keywords are added", async ({
			submissionPage,
		}) => {
			// Arrange
			await submissionPage.goto();
			const keywordsSection = submissionPage.getKeywordsSection();

			// Act & Assert - keywords appear as tags
			await submissionPage.addKeyword("first");
			await expect(keywordsSection.getByText("first")).toBeVisible();

			await submissionPage.addKeyword("second");
			await expect(keywordsSection.getByText("second")).toBeVisible();

			await submissionPage.addKeyword("third");
			await expect(keywordsSection.getByText("third")).toBeVisible();

			// Verify all three Remove buttons exist
			await expect(keywordsSection.getByRole("button", { name: /Remove/ })).toHaveCount(3);
		});

		test("prevents duplicate keywords", async ({ submissionPage }) => {
			// Arrange
			await submissionPage.goto();
			await submissionPage.addKeyword("duplicate");
			await expect(submissionPage.page.getByText("duplicate")).toBeVisible();

			// Act
			await submissionPage.addKeyword("duplicate");

			// Assert
			await expect(
				submissionPage.page.getByText(/already added/i),
			).toBeVisible();
			// Only one keyword tag exists (duplicate was rejected)
			const keywordsSection = submissionPage.getKeywordsSection();
			await expect(keywordsSection.getByRole("button", { name: /Remove/ })).toHaveCount(1);
		});

		test("can remove keyword", async ({ submissionPage }) => {
			// Arrange
			await submissionPage.goto();
			await submissionPage.addKeyword("removable");
			await expect(submissionPage.page.getByText("removable")).toBeVisible();

			// Act
			await submissionPage.page
				.getByRole("button", { name: "Remove removable" })
				.click();

			// Assert
			await expect(
				submissionPage.page.getByText("removable"),
			).not.toBeVisible();
			// No keyword tags remain
			const keywordsSection = submissionPage.getKeywordsSection();
			await expect(keywordsSection.getByRole("button", { name: /Remove/ })).toHaveCount(0);
		});
	});

	test.describe("Author Validation", () => {
		test("shows error when author affiliation is missing", async ({
			submissionPage,
		}) => {
			// Arrange
			await submissionPage.goto();
			await submissionPage.fillTitle(VALID_SUBMISSION.title);
			await submissionPage.fillContent(VALID_SUBMISSION.content);
			await submissionPage.addKeyword("test1");
			await submissionPage.addKeyword("test2");
			await submissionPage.addKeyword("test3");

			// Add second author without affiliation
			await submissionPage.addAuthor();
			await submissionPage.page.locator("#author-1-firstName").fill("NoAffil");
			await submissionPage.page.locator("#author-1-lastName").fill("Author");
			await submissionPage.page.locator("#author-1-email").fill("noaffil@test.com");

			// Act
			await submissionPage.submit();

			// Assert
			await expect(
				submissionPage.page.getByText(/affiliation.*required/i),
			).toBeVisible({ timeout: 10000 });
		});
	});
});
