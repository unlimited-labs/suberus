import { test, expect } from "./fixtures";

test.describe("Affiliations", () => {
	test("can select existing affiliation from autocomplete", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();
		const input = submissionPage.getAuthorCard(0).getByLabel("Affiliation");
		const option = submissionPage.page.getByRole("option", { name: "Test University", exact: true });

		// Act — retry pattern: autocomplete dropdown can re-render and detach
		await expect(async () => {
			await input.click();
			await input.fill("Test Univ");
			await expect(option).toBeVisible();
			await option.click();
			await expect(input).toHaveValue("Test University");
		}).toPass({ timeout: 15000 });
	});

	test("creates new affiliation via Create option", async ({
		submissionPage,
		testRun,
	}) => {
		await submissionPage.goto();
		const input = submissionPage.getAuthorCard(0).getByLabel("Affiliation");
		const uniqueAffiliation = `New Affiliation ${testRun.testRunId}`;

		// Act — retry pattern: dropdown can re-render and detach
		await expect(async () => {
			await input.fill(uniqueAffiliation);
			const createOption = submissionPage.page.getByRole("option").filter({ hasText: `Create "${uniqueAffiliation}"` });
			await expect(createOption).toBeVisible();
			await createOption.click();
			await expect(input).toHaveValue(uniqueAffiliation);
		}).toPass({ timeout: 15000 });
	});

	test("each author can have different affiliation", async ({
		submissionPage,
	}) => {
		test.slow(); // Filling 2 authors with affiliations under load
		await submissionPage.goto();

		// Act — add author and fill text fields first, then affiliations last
		// (affiliation API calls can trigger React re-renders that reset the form)
		await submissionPage.addAuthor();
		await submissionPage.page.locator("#author-1-firstName").fill("Jane");
		await submissionPage.page.locator("#author-1-lastName").fill("Doe");
		await submissionPage.page.locator("#author-1-email").fill("jane@test.com");

		await submissionPage.fillAffiliation(0, "First University");
		await submissionPage.fillAffiliation(1, "Second University");

		const firstInput = submissionPage.getAuthorCard(0).getByLabel("Affiliation");
		await expect(firstInput).toHaveValue("First University");
		const secondInput = submissionPage.getAuthorCard(1).getByLabel("Affiliation");
		await expect(secondInput).toHaveValue("Second University");
	});
});

test.describe("Affiliations - edge cases", () => {
	test("case-insensitive match hides Create option", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();
		const input = submissionPage.getAuthorCard(0).getByLabel("Affiliation");

		await input.fill("test university");
		await expect(
			submissionPage.page.getByRole("option", { name: "Test University", exact: true }),
		).toBeVisible({ timeout: 5000 });

		// Assert - no Create option should appear since it's a case-insensitive match
		await expect(
			submissionPage.page.getByRole("option").filter({ hasText: /^Create "/ }),
		).toBeHidden();
	});

	test("keyboard ArrowDown + Enter selects affiliation", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();
		const input = submissionPage.getAuthorCard(0).getByLabel("Affiliation");

		await input.fill("Test Univ");
		await expect(
			submissionPage.page.getByRole("option", { name: "Test University", exact: true }),
		).toBeVisible({ timeout: 5000 });
		await input.press("ArrowDown");
		await input.press("Enter");

		await expect(input).toHaveValue("Test University");
	});

	test("Escape closes dropdown without selecting", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();
		const input = submissionPage.getAuthorCard(0).getByLabel("Affiliation");

		await input.fill("Test Univ");
		await expect(
			submissionPage.page.getByRole("option", { name: "Test University", exact: true }),
		).toBeVisible({ timeout: 5000 });
		await input.press("Escape");

		await expect(
			submissionPage.page.getByRole("option"),
		).toBeHidden();
		await expect(input).toHaveValue("Test Univ");
	});

	test("blur auto-creates affiliation when no option selected", async ({
		submissionPage,
		testRun,
	}) => {
		await submissionPage.goto();
		const input = submissionPage.getAuthorCard(0).getByLabel("Affiliation");
		const uniqueName = `Blur Create ${testRun.testRunId}`;

		await input.fill(uniqueName);
		await expect(
			submissionPage.page.getByRole("option").filter({ hasText: `Create "${uniqueName}"` }),
		).toBeVisible({ timeout: 5000 });
		await input.press("Tab");

		await expect(input).toHaveValue(uniqueName, { timeout: 5000 });
		// Verify the data attribute is set (server returned an ID)
		await expect(input).toHaveAttribute("data-affiliation-id", /.+/, { timeout: 5000 });
	});

	test("clearing input resets affiliation value", async ({
		submissionPage,
	}) => {
		await submissionPage.goto();
		const input = submissionPage.getAuthorCard(0).getByLabel("Affiliation");

		await submissionPage.fillAffiliation(0, "Test University");
		await expect(input).toHaveValue("Test University");
		await expect(input).toHaveAttribute("data-affiliation-id", /.+/);

		await expect(async () => {
			await input.clear();
			await expect(input).toHaveValue("");
			await expect(input).not.toHaveAttribute("data-affiliation-id");
		}).toPass({ timeout: 10000 });
	});
});
