import { test, expect } from "./fixtures";

test.describe("Author Management", () => {
	test("can add second author with empty fields", async ({ submissionPage }) => {
		await submissionPage.goto();
		await expect(submissionPage.page.locator("#author-0-firstName")).toBeVisible();
		await expect(submissionPage.page.locator("#author-1-firstName")).not.toBeVisible();

		await submissionPage.addAuthor();

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
		await submissionPage.addAuthor();
		await expect(submissionPage.page.locator("#author-1-firstName")).toBeVisible();

		const firstAuthorCard = submissionPage.getAuthorCard(0);
		const firstRemoveButton = firstAuthorCard.getByRole("button", { name: "Remove author" });
		const secondAuthorCard = submissionPage.getAuthorCard(1);
		const secondRemoveButton = secondAuthorCard.getByRole("button", { name: "Remove author" });

		await expect(firstRemoveButton).toBeEnabled();
		await expect(secondRemoveButton).toBeEnabled();

		await secondRemoveButton.click();

		await expect(submissionPage.page.locator("#author-1-firstName")).not.toBeVisible();
		await expect(submissionPage.page.locator("#author-0-firstName")).toBeVisible();
		await expect(firstRemoveButton).toBeDisabled();
	});

	test("cannot remove last remaining author", async ({ submissionPage }) => {
		await submissionPage.goto();

		await expect(submissionPage.page.locator("#author-0-firstName")).toBeVisible();
		await expect(submissionPage.page.locator("#author-1-firstName")).not.toBeVisible();

		const authorCard = submissionPage.getAuthorCard(0);
		const removeButton = authorCard.getByRole("button", { name: "Remove author" });
		await expect(removeButton).toBeDisabled();
	});

	test("first author is presenter by default", async ({ submissionPage }) => {
		await submissionPage.goto();

		const firstAuthorCard = submissionPage.getAuthorCard(0);
		await expect(
			firstAuthorCard.getByRole("button", { name: "Presenting author" }),
		).toBeVisible();
	});

	test("can change presenter to different author", async ({ submissionPage }) => {
		await submissionPage.goto();
		await submissionPage.addAuthor();

		const firstAuthorCard = submissionPage.getAuthorCard(0);
		const secondAuthorCard = submissionPage.getAuthorCard(1);

		await expect(firstAuthorCard.getByRole("button", { name: "Presenting author" })).toBeVisible();
		await expect(secondAuthorCard.getByRole("button", { name: "Set as presenter" })).toBeVisible();

		await secondAuthorCard.getByRole("button", { name: "Set as presenter" }).click();

		await expect(secondAuthorCard.getByRole("button", { name: "Presenting author" })).toBeVisible();
		await expect(firstAuthorCard.getByRole("button", { name: "Set as presenter" })).toBeVisible();
	});

	test("presenter badge moves when removing presenter author", async ({ submissionPage }) => {
		await submissionPage.goto();
		await submissionPage.addAuthor();

		const secondAuthorCard = submissionPage.getAuthorCard(1);

		// Wait for the button to be stable after React re-render from addAuthor
		await expect(secondAuthorCard.getByRole("button", { name: "Set as presenter" })).toBeVisible();
		await secondAuthorCard.getByRole("button", { name: "Set as presenter" }).click();
		await expect(secondAuthorCard.getByRole("button", { name: "Presenting author" })).toBeVisible();

		await secondAuthorCard.getByRole("button", { name: "Remove author" }).click();

		await expect(submissionPage.page.locator("#author-1-firstName")).not.toBeVisible();
		const firstAuthorCard = submissionPage.getAuthorCard(0);
		await expect(firstAuthorCard.getByRole("button", { name: "Presenting author" })).toBeVisible();
	});

	test("can fill second author details", async ({ submissionPage }) => {
		await submissionPage.goto();
		await submissionPage.addAuthor();

		await submissionPage.fillAuthor(1, {
			firstName: "Jane",
			lastName: "Smith",
			email: "jane.smith@test.com",
			affiliationName: "Another University",
		});

		await expect(submissionPage.page.locator("#author-1-firstName")).toHaveValue("Jane");
		await expect(submissionPage.page.locator("#author-1-lastName")).toHaveValue("Smith");
		await expect(submissionPage.page.locator("#author-1-email")).toHaveValue("jane.smith@test.com");
	});

	test("can submit with multiple authors", async ({ submissionPage, uniqueSubmission }) => {
		test.setTimeout(180000); // Heavy test: 2 authors with affiliations + submit under load
		await submissionPage.goto();
		await submissionPage.fillTitle(uniqueSubmission.title);
		await submissionPage.fillContent(uniqueSubmission.content);
		await submissionPage.addAuthor();
		// Fill author details (name/email) first, then affiliations last
		// React re-renders when filling authors can clear affiliation state
		await submissionPage.page.locator("#author-0-firstName").fill(uniqueSubmission.authors[0].firstName);
		await submissionPage.page.locator("#author-0-lastName").fill(uniqueSubmission.authors[0].lastName);
		await submissionPage.page.locator("#author-0-email").fill(uniqueSubmission.authors[0].email);
		await submissionPage.page.locator("#author-1-firstName").fill("Co");
		await submissionPage.page.locator("#author-1-lastName").fill("Author");
		await submissionPage.page.locator("#author-1-email").fill("co.author@test.com");
		await submissionPage.fillAffiliation(0, uniqueSubmission.authors[0].affiliationName);
		for (const keyword of uniqueSubmission.keywords) {
			await submissionPage.addKeyword(keyword);
		}
		// Set 2nd author affiliation last (React re-renders from other operations can clear it)
		await submissionPage.fillAffiliation(1, "Partner University");

		// Wait for submit button to be enabled (form validation complete)
		await expect(submissionPage.submitButton).toBeEnabled({ timeout: 10000 });

		// Act & Assert — submit with retry (server function can transiently fail under load)
		await expect(async () => {
			if (await submissionPage.submitButton.isEnabled()) {
				await submissionPage.submitButton.click();
			}
			await expect(submissionPage.page).toHaveURL(/\/submissions\/[a-f0-9-]+/, { timeout: 15000 });
		}).toPass({ timeout: 90000 });
		await expect(submissionPage.page.getByText("Submission created successfully")).toBeVisible();
	});
});
