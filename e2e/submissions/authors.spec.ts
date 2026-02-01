import { test, expect, VALID_SUBMISSION } from "./fixtures";

test.describe("Author Management", () => {
	test("can add second author with empty fields", async ({ submissionPage }) => {
		await submissionPage.goto();

		// Initially one author exists
		await expect(
			submissionPage.page.locator("#author-0-firstName"),
		).toBeVisible();
		await expect(
			submissionPage.page.locator("#author-1-firstName"),
		).not.toBeVisible();

		// Add second author
		await submissionPage.addAuthor();

		// Second author fields should be visible and empty
		const secondFirstName = submissionPage.page.locator("#author-1-firstName");
		const secondLastName = submissionPage.page.locator("#author-1-lastName");
		const secondEmail = submissionPage.page.locator("#author-1-email");

		await expect(secondFirstName).toBeVisible();
		await expect(secondLastName).toBeVisible();
		await expect(secondEmail).toBeVisible();

		await expect(secondFirstName).toHaveValue("");
		await expect(secondLastName).toHaveValue("");
		await expect(secondEmail).toHaveValue("");
	});

	test("can remove any author when multiple exist", async ({ submissionPage }) => {
		await submissionPage.goto();

		// Add second author
		await submissionPage.addAuthor();
		await expect(
			submissionPage.page.locator("#author-1-firstName"),
		).toBeVisible();

		// Both authors' remove buttons should be enabled when there are 2+ authors
		const firstAuthorCard = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-0-firstName") });
		const firstRemoveButton = firstAuthorCard.getByRole("button", {
			name: "Remove author",
		});
		await expect(firstRemoveButton).toBeEnabled();

		const secondAuthorCard = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-1-firstName") });
		const secondRemoveButton = secondAuthorCard.getByRole("button", {
			name: "Remove author",
		});
		await expect(secondRemoveButton).toBeEnabled();

		// Remove second author
		await secondRemoveButton.click();

		// Second author should be gone
		await expect(
			submissionPage.page.locator("#author-1-firstName"),
		).not.toBeVisible();

		// First author still exists and now remove is disabled (only 1 left)
		await expect(
			submissionPage.page.locator("#author-0-firstName"),
		).toBeVisible();
		await expect(firstRemoveButton).toBeDisabled();
	});

	test("cannot remove last remaining author", async ({ submissionPage }) => {
		await submissionPage.goto();

		// Only one author exists
		await expect(
			submissionPage.page.locator("#author-0-firstName"),
		).toBeVisible();
		await expect(
			submissionPage.page.locator("#author-1-firstName"),
		).not.toBeVisible();

		// Remove button should be disabled
		const authorCard = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-0-firstName") });
		const removeButton = authorCard.getByRole("button", {
			name: "Remove author",
		});
		await expect(removeButton).toBeDisabled();
	});

	test("first author is presenter by default", async ({ submissionPage }) => {
		await submissionPage.goto();

		// First author should have presenter badge
		const firstAuthorCard = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-0-firstName") });

		await expect(
			firstAuthorCard.getByRole("button", { name: "Presenting author" }),
		).toBeVisible();
	});

	test("can change presenter to different author", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();

		// Add second author
		await submissionPage.addAuthor();

		// First author is presenter
		const firstAuthorCard = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-0-firstName") });
		const secondAuthorCard = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-1-firstName") });

		await expect(
			firstAuthorCard.getByRole("button", { name: "Presenting author" }),
		).toBeVisible();
		await expect(
			secondAuthorCard.getByRole("button", { name: "Set as presenter" }),
		).toBeVisible();

		// Click "Set as presenter" on second author
		await secondAuthorCard
			.getByRole("button", { name: "Set as presenter" })
			.click();

		// Now second author should be presenter
		await expect(
			secondAuthorCard.getByRole("button", { name: "Presenting author" }),
		).toBeVisible();
		await expect(
			firstAuthorCard.getByRole("button", { name: "Set as presenter" }),
		).toBeVisible();
	});

	test("presenter badge moves when removing presenter author", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();

		// Add second author and make them presenter
		await submissionPage.addAuthor();

		const secondAuthorCard = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-1-firstName") });

		await secondAuthorCard
			.getByRole("button", { name: "Set as presenter" })
			.click();

		// Verify second is presenter
		await expect(
			secondAuthorCard.getByRole("button", { name: "Presenting author" }),
		).toBeVisible();

		// Remove second author (the presenter)
		await secondAuthorCard.getByRole("button", { name: "Remove author" }).click();

		// First author should now be presenter
		await expect(
			submissionPage.page.locator("#author-1-firstName"),
		).not.toBeVisible();

		const firstAuthorCard = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-0-firstName") });
		await expect(
			firstAuthorCard.getByRole("button", { name: "Presenting author" }),
		).toBeVisible();
	});

	test("can fill second author details", async ({ submissionPage }) => {
		await submissionPage.goto();

		// Add second author
		await submissionPage.addAuthor();

		// Fill second author details
		await submissionPage.fillAuthor(1, {
			firstName: "Jane",
			lastName: "Smith",
			email: "jane.smith@test.com",
			affiliationName: "Another University",
		});

		// Verify values are set
		await expect(submissionPage.page.locator("#author-1-firstName")).toHaveValue(
			"Jane",
		);
		await expect(submissionPage.page.locator("#author-1-lastName")).toHaveValue(
			"Smith",
		);
		await expect(submissionPage.page.locator("#author-1-email")).toHaveValue(
			"jane.smith@test.com",
		);
	});

	test("can submit with multiple authors", async ({ submissionPage }) => {
		await submissionPage.goto();

		// Fill first author (auto-filled but ensure affiliation)
		await submissionPage.fillAuthor(0, VALID_SUBMISSION.authors[0]);

		// Add and fill second author
		await submissionPage.addAuthor();
		await submissionPage.fillAuthor(1, {
			firstName: "Co",
			lastName: "Author",
			email: "co.author@test.com",
			affiliationName: "Partner University",
		});

		// Fill rest of form
		await submissionPage.fillTitle(VALID_SUBMISSION.title);
		await submissionPage.fillContent(VALID_SUBMISSION.content);

		for (const keyword of VALID_SUBMISSION.keywords) {
			await submissionPage.addKeyword(keyword);
		}

		await submissionPage.submit();

		// Should redirect to submission detail
		await submissionPage.page.waitForURL(/\/submissions\/[a-f0-9-]+/, {
			timeout: 15000,
		});

		await expect(
			submissionPage.page.getByText("Submission created successfully"),
		).toBeVisible();
	});
});
