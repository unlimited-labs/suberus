import { test, expect } from "./fixtures";

test.describe("Affiliations", () => {
	test("can select existing affiliation from autocomplete", async ({
		submissionPage,
	}) => {
		// Arrange
		await submissionPage.goto();
		const affiliationInput =
			submissionPage.page.getByPlaceholder("Type affiliation...");
		await affiliationInput.clear();

		// Act
		await affiliationInput.fill("Test Univ");
		await expect(
			submissionPage.page.getByRole("option", { name: "Test University", exact: true }),
		).toBeVisible({ timeout: 5000 });
		await submissionPage.page
			.getByRole("option", { name: "Test University", exact: true })
			.click();

		// Assert
		await expect(affiliationInput).toHaveValue("Test University");
	});

	test("creates new affiliation when typing unknown name and blurring", async ({
		submissionPage,
		testRun,
	}) => {
		// Arrange
		await submissionPage.goto();
		const affiliationInput =
			submissionPage.page.getByPlaceholder("Type affiliation...");
		const uniqueAffiliation = `New Affiliation ${testRun.testRunId}`;

		// Act
		await affiliationInput.clear();
		await affiliationInput.fill(uniqueAffiliation);
		await affiliationInput.blur();

		// Assert
		await expect(affiliationInput).toHaveValue(uniqueAffiliation, {
			timeout: 5000,
		});
	});

	test("each author can have different affiliation", async ({
		submissionPage,
	}) => {
		test.slow(); // Filling 2 authors with affiliations under load
		// Arrange
		await submissionPage.goto();
		const firstAffiliationInput = submissionPage.getAuthorCard(0)
			.getByPlaceholder("Type affiliation...");

		// Act - Use fillAffiliation to wait for API response before addAuthor
		await submissionPage.fillAffiliation(0, "First University");

		await submissionPage.addAuthor();
		await submissionPage.page.locator("#author-1-firstName").fill("Jane");
		await submissionPage.page.locator("#author-1-lastName").fill("Doe");
		await submissionPage.page.locator("#author-1-email").fill("jane@test.com");

		await submissionPage.fillAffiliation(1, "Second University");

		// Assert
		await expect(firstAffiliationInput).toHaveValue("First University");
		const secondAffiliationInput = submissionPage.getAuthorCard(1)
			.getByPlaceholder("Type affiliation...");
		await expect(secondAffiliationInput).toHaveValue("Second University");
	});
});
