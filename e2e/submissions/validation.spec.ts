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

		test("shows character count indicator for content", async ({
			submissionPage,
		}) => {
			// Arrange
			await submissionPage.goto();

			// Act
			await submissionPage.fillContent("Test content here");

			// Assert
			await expect(
				submissionPage.page.getByText(/17 \/ \d+-\d+ characters/),
			).toBeVisible();
		});
	});

	test.describe("Keywords Validation", () => {
		test("shows minimum keywords requirement", async ({ submissionPage }) => {
			// Arrange
			await submissionPage.goto();

			// Assert
			await expect(
				submissionPage.page.getByText(/0 \/ 3-5 keywords/),
			).toBeVisible();
			await expect(
				submissionPage.page.getByText(/minimum 3 required/i),
			).toBeVisible();
		});

		test("updates keyword count as keywords are added", async ({
			submissionPage,
		}) => {
			// Arrange
			await submissionPage.goto();

			// Act & Assert
			await submissionPage.addKeyword("first");
			await expect(
				submissionPage.page.getByText(/1 \/ 3-5 keywords/),
			).toBeVisible();

			await submissionPage.addKeyword("second");
			await expect(
				submissionPage.page.getByText(/2 \/ 3-5 keywords/),
			).toBeVisible();

			await submissionPage.addKeyword("third");
			await expect(
				submissionPage.page.getByText(/3 \/ 3-5 keywords/),
			).toBeVisible();
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
			await expect(
				submissionPage.page.getByText(/1 \/ 3-5 keywords/),
			).toBeVisible();
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
			await expect(
				submissionPage.page.getByText(/0 \/ 3-5 keywords/),
			).toBeVisible();
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
