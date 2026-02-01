import { test, expect, VALID_SUBMISSION } from "./fixtures";

test.describe("Full User Flow", () => {
	test("submission redirect shows success message", async ({ submissionPage }) => {
		await submissionPage.goto();
		await submissionPage.fillCompleteForm(VALID_SUBMISSION);
		await submissionPage.submit();

		// Wait for redirect to detail page
		await submissionPage.page.waitForURL(/\/submissions\/[a-f0-9-]+/, {
			timeout: 15000,
		});

		// Verify success message
		await expect(
			submissionPage.page.getByText("Submission created successfully"),
		).toBeVisible();

		// URL should contain a valid UUID
		const url = submissionPage.page.url();
		expect(url).toMatch(/\/submissions\/[a-f0-9-]{36}$/);
	});
});
