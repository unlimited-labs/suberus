import { test, expect } from "./fixtures";

test.describe("Affiliations", () => {
	test("can select existing affiliation from autocomplete", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();

		const affiliationInput =
			submissionPage.page.getByPlaceholder("Type affiliation...");

		// Clear any auto-filled value
		await affiliationInput.clear();

		// Type to search - "Test University" should exist from seed data
		await affiliationInput.fill("Test Univ");

		// Wait for autocomplete dropdown
		await expect(
			submissionPage.page.getByRole("option", { name: "Test University", exact: true }),
		).toBeVisible({ timeout: 5000 });

		// Select from dropdown
		await submissionPage.page
			.getByRole("option", { name: "Test University", exact: true })
			.click();

		// Verify selection
		await expect(affiliationInput).toHaveValue("Test University");
	});

	test("creates new affiliation when typing unknown name and blurring", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();

		const affiliationInput =
			submissionPage.page.getByPlaceholder("Type affiliation...");
		const uniqueAffiliation = `New Affiliation ${Date.now()}`;

		// Clear and type new affiliation name
		await affiliationInput.clear();
		await affiliationInput.fill(uniqueAffiliation);

		// Blur to trigger creation
		await affiliationInput.blur();

		// Wait for network (API call to create affiliation)
		await submissionPage.page.waitForLoadState("networkidle");

		// Value should persist
		await expect(affiliationInput).toHaveValue(uniqueAffiliation, {
			timeout: 5000,
		});
	});

	test("each author can have different affiliation", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();

		// Set first author's affiliation
		const firstAffiliationInput = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-0-firstName") })
			.getByPlaceholder("Type affiliation...");

		await firstAffiliationInput.clear();
		await firstAffiliationInput.fill("First University");
		await firstAffiliationInput.blur();
		await submissionPage.page.waitForLoadState("networkidle");

		// Add second author
		await submissionPage.addAuthor();

		// Fill second author with different affiliation
		await submissionPage.page.locator("#author-1-firstName").fill("Jane");
		await submissionPage.page.locator("#author-1-lastName").fill("Doe");
		await submissionPage.page.locator("#author-1-email").fill("jane@test.com");

		const secondAffiliationInput = submissionPage.page
			.locator(".rounded-lg.border")
			.filter({ has: submissionPage.page.locator("#author-1-firstName") })
			.getByPlaceholder("Type affiliation...");

		await secondAffiliationInput.fill("Second University");
		await secondAffiliationInput.blur();
		await submissionPage.page.waitForLoadState("networkidle");

		// Verify both have different values
		await expect(firstAffiliationInput).toHaveValue("First University");
		await expect(secondAffiliationInput).toHaveValue("Second University");
	});
});
