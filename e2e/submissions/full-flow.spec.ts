import { test, expect } from "./fixtures";

test.describe("Full User Flow", () => {
	test("submission redirect shows success message", async ({ submissionPage, uniqueSubmission }) => {
		test.slow(); // Full form fill + submit + redirect under load
		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);

		// Act
		await submissionPage.submit();
		await submissionPage.page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 60000 });

		// Assert
		await expect(submissionPage.page.getByText("Submission created successfully")).toBeVisible();
		const url = submissionPage.page.url();
		expect(url).toMatch(/\/submissions\/[a-f0-9-]{36}$/);
	});
});
