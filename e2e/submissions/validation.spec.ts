import { test, expect, VALID_SUBMISSION } from "./fixtures";

test.describe("Form Validation", () => {
	test.describe("Content Validation", () => {
		test("shows error for content too short", async ({ submissionPage }) => {
			await submissionPage.goto();

			await submissionPage.fillTitle(VALID_SUBMISSION.title);
			await submissionPage.fillContent("This content is too short.");
			await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);

			await submissionPage.addKeyword("test1");
			await submissionPage.addKeyword("test2");
			await submissionPage.addKeyword("test3");

			await submissionPage.submit();

			// Should show validation error (min 500 chars from settings)
			await expect(
				submissionPage.page.getByText(/at least 500 characters/i),
			).toBeVisible({ timeout: 10000 });
		});

		test("shows character count indicator for content", async ({
			submissionPage,
		}) => {
			await submissionPage.goto();

			await submissionPage.fillContent("Test content here");

			// Should show character count in format "X / Y-Z characters"
			await expect(
				submissionPage.page.getByText(/17 \/ \d+-\d+ characters/),
			).toBeVisible();
		});
	});

	test.describe("Keywords Validation", () => {
		test("shows minimum keywords requirement", async ({ submissionPage }) => {
			await submissionPage.goto();

			// Keywords section should show requirement
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
			await submissionPage.goto();

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
			await submissionPage.goto();

			await submissionPage.addKeyword("duplicate");
			await expect(submissionPage.page.getByText("duplicate")).toBeVisible();

			// Try to add same keyword again
			await submissionPage.addKeyword("duplicate");

			// Should show error message
			await expect(
				submissionPage.page.getByText(/already added/i),
			).toBeVisible();

			// Count should still be 1
			await expect(
				submissionPage.page.getByText(/1 \/ 3-5 keywords/),
			).toBeVisible();
		});

		test("can remove keyword", async ({ submissionPage }) => {
			await submissionPage.goto();

			await submissionPage.addKeyword("removable");
			await expect(submissionPage.page.getByText("removable")).toBeVisible();

			// Click remove button on keyword
			await submissionPage.page
				.getByRole("button", { name: "Remove removable" })
				.click();

			// Keyword should be gone
			await expect(
				submissionPage.page.getByText("removable"),
			).not.toBeVisible();

			// Count should be 0
			await expect(
				submissionPage.page.getByText(/0 \/ 3-5 keywords/),
			).toBeVisible();
		});
	});

	test.describe("Author Validation", () => {
		test("shows error when author affiliation is missing", async ({
			submissionPage,
		}) => {
			await submissionPage.goto();

			// Fill author without affiliation - clear auto-filled data
			await submissionPage.page.locator("#author-0-firstName").clear();
			await submissionPage.page.locator("#author-0-firstName").fill("Test");
			await submissionPage.page.locator("#author-0-lastName").clear();
			await submissionPage.page.locator("#author-0-lastName").fill("User");
			await submissionPage.page.locator("#author-0-email").clear();
			await submissionPage.page
				.locator("#author-0-email")
				.fill("test@valid.com");

			// Clear affiliation
			const affiliationInput = submissionPage.page
				.locator(".rounded-lg.border")
				.filter({ has: submissionPage.page.locator("#author-0-firstName") })
				.getByPlaceholder("Type affiliation...");
			await affiliationInput.clear();

			await submissionPage.fillTitle(VALID_SUBMISSION.title);
			await submissionPage.fillContent(VALID_SUBMISSION.content);

			await submissionPage.addKeyword("test1");
			await submissionPage.addKeyword("test2");
			await submissionPage.addKeyword("test3");

			await submissionPage.submit();

			// Should show validation error about affiliation
			await expect(
				submissionPage.page.getByText(/affiliation.*required/i),
			).toBeVisible({ timeout: 10000 });
		});
	});
});
