import { test, expect } from "./fixtures";

test.describe("Full User Flow", () => {
	test("submission redirect shows success message", async ({ submissionPage, uniqueSubmission }) => {
		// Arrange
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(uniqueSubmission);

		// Act
		await submissionPage.submit();
		await submissionPage.page.waitForURL(/\/submissions\/[a-f0-9-]+/, { timeout: 30000 });

		// Assert
		await expect(submissionPage.page.getByText("Submission created successfully")).toBeVisible();
		const url = submissionPage.page.url();
		expect(url).toMatch(/\/submissions\/[a-f0-9-]{36}$/);
	});
});
