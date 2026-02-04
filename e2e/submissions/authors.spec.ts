import { test, expect } from "./fixtures";

test.describe("Author Management", () => {
	test("can add second author with empty fields", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		await expect(submissionPage.page.locator("#author-0-firstName")).toBeVisible();
		await expect(submissionPage.page.locator("#author-1-firstName")).not.toBeVisible();

		// Act
		await submissionPage.addAuthor();

		// Assert
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
		// Arrange
		await submissionPage.goto();
		await submissionPage.addAuthor();
		await expect(submissionPage.page.locator("#author-1-firstName")).toBeVisible();

		const firstAuthorCard = submissionPage.getAuthorCard(0);
		const firstRemoveButton = firstAuthorCard.getByRole("button", { name: "Remove author" });
		const secondAuthorCard = submissionPage.getAuthorCard(1);
		const secondRemoveButton = secondAuthorCard.getByRole("button", { name: "Remove author" });

		await expect(firstRemoveButton).toBeEnabled();
		await expect(secondRemoveButton).toBeEnabled();

		// Act
		await secondRemoveButton.click();

		// Assert
		await expect(submissionPage.page.locator("#author-1-firstName")).not.toBeVisible();
		await expect(submissionPage.page.locator("#author-0-firstName")).toBeVisible();
		await expect(firstRemoveButton).toBeDisabled();
	});

	test("cannot remove last remaining author", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();

		// Assert
		await expect(submissionPage.page.locator("#author-0-firstName")).toBeVisible();
		await expect(submissionPage.page.locator("#author-1-firstName")).not.toBeVisible();

		const authorCard = submissionPage.getAuthorCard(0);
		const removeButton = authorCard.getByRole("button", { name: "Remove author" });
		await expect(removeButton).toBeDisabled();
	});

	test("first author is presenter by default", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();

		// Assert
		const firstAuthorCard = submissionPage.getAuthorCard(0);
		await expect(
			firstAuthorCard.getByRole("button", { name: "Presenting author" }),
		).toBeVisible();
	});

	test("can change presenter to different author", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.addAuthor();

		const firstAuthorCard = submissionPage.getAuthorCard(0);
		const secondAuthorCard = submissionPage.getAuthorCard(1);

		await expect(firstAuthorCard.getByRole("button", { name: "Presenting author" })).toBeVisible();
		await expect(secondAuthorCard.getByRole("button", { name: "Set as presenter" })).toBeVisible();

		// Act
		await secondAuthorCard.getByRole("button", { name: "Set as presenter" }).click();

		// Assert
		await expect(secondAuthorCard.getByRole("button", { name: "Presenting author" })).toBeVisible();
		await expect(firstAuthorCard.getByRole("button", { name: "Set as presenter" })).toBeVisible();
	});

	test("presenter badge moves when removing presenter author", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.addAuthor();

		const secondAuthorCard = submissionPage.getAuthorCard(1);

		await secondAuthorCard.getByRole("button", { name: "Set as presenter" }).click();
		await expect(secondAuthorCard.getByRole("button", { name: "Presenting author" })).toBeVisible();

		// Act
		await secondAuthorCard.getByRole("button", { name: "Remove author" }).click();

		// Assert
		await expect(submissionPage.page.locator("#author-1-firstName")).not.toBeVisible();
		const firstAuthorCard = submissionPage.getAuthorCard(0);
		await expect(firstAuthorCard.getByRole("button", { name: "Presenting author" })).toBeVisible();
	});

	test("can fill second author details", async ({ submissionPage }) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.addAuthor();

		// Act
		await submissionPage.fillAuthor(1, {
			firstName: "Jane",
			lastName: "Smith",
			email: "jane.smith@test.com",
			affiliationName: "Another University",
		});

		// Assert
		await expect(submissionPage.page.locator("#author-1-firstName")).toHaveValue("Jane");
		await expect(submissionPage.page.locator("#author-1-lastName")).toHaveValue("Smith");
		await expect(submissionPage.page.locator("#author-1-email")).toHaveValue("jane.smith@test.com");
	});

	test("can submit with multiple authors", async ({ submissionPage, uniqueSubmission }) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.fillAuthor(0, uniqueSubmission.authors[0]);
		await submissionPage.addAuthor();
		await submissionPage.fillAuthor(1, {
			firstName: "Co",
			lastName: "Author",
			email: "co.author@test.com",
			affiliationName: "Partner University",
		});
		await submissionPage.fillTitle(uniqueSubmission.title);
		await submissionPage.fillContent(uniqueSubmission.content);
		for (const keyword of uniqueSubmission.keywords) {
			await submissionPage.addKeyword(keyword);
		}

		// Act
		await submissionPage.submit();

		// Assert
		await submissionPage.page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });
		await expect(submissionPage.page.getByText("Submission created successfully")).toBeVisible();
	});
});
