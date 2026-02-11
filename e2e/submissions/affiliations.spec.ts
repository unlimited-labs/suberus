import { test, expect } from "./fixtures";

test.describe("Affiliations", () => {
	test("can select existing affiliation from autocomplete", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();
		const trigger = submissionPage.getAuthorCard(0).getByRole("combobox", { name: /affiliation/i });

		// Act
		await trigger.click();
		await submissionPage.page.getByPlaceholder("Search affiliation...").fill("Test Univ");
		await expect(
			submissionPage.page.getByRole("option", { name: "Test University", exact: true }),
		).toBeVisible({ timeout: 5000 });
		await submissionPage.page
			.getByRole("option", { name: "Test University", exact: true })
			.click();

		// Assert
		await expect(trigger).toContainText("Test University");
	});

	test("creates new affiliation via Create option", async ({
		submissionPage,
		testRun,
	}) => {
		// Arrange
		await submissionPage.goto();
		const trigger = submissionPage.getAuthorCard(0).getByRole("combobox", { name: /affiliation/i });
		const uniqueAffiliation = `New Affiliation ${testRun.testRunId}`;

		// Act
		await trigger.click();
		await submissionPage.page.getByPlaceholder("Search affiliation...").fill(uniqueAffiliation);
		const createOption = submissionPage.page.getByRole("option").filter({ hasText: `Create "${uniqueAffiliation}"` });
		await expect(createOption).toBeVisible({ timeout: 5000 });
		await createOption.click();

		// Assert
		await expect(trigger).toContainText(uniqueAffiliation, { timeout: 5000 });
	});

	test("each author can have different affiliation", async ({
		submissionPage,
	}) => {
		test.slow(); // Filling 2 authors with affiliations under load
		// Arrange
		await submissionPage.goto();

		// Act
		await submissionPage.fillAffiliation(0, "First University");

		await submissionPage.addAuthor();
		await submissionPage.page.locator("#author-1-firstName").fill("Jane");
		await submissionPage.page.locator("#author-1-lastName").fill("Doe");
		await submissionPage.page.locator("#author-1-email").fill("jane@test.com");

		await submissionPage.fillAffiliation(1, "Second University");

		// Assert
		const firstTrigger = submissionPage.getAuthorCard(0).getByRole("combobox", { name: /affiliation/i });
		await expect(firstTrigger).toContainText("First University");
		const secondTrigger = submissionPage.getAuthorCard(1).getByRole("combobox", { name: /affiliation/i });
		await expect(secondTrigger).toContainText("Second University");
	});
});
