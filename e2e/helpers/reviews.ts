import { expect, type Page } from "@playwright/test";

/**
 * From the reviewer assignments list (already loaded), open the review form for
 * the assignment whose row matches `title` and wait for the review URL.
 */
export async function openReviewFromAssignmentList(
	page: Page,
	title: string,
	{ waitForUrlTimeout = 30000 }: { waitForUrlTimeout?: number } = {},
) {
	const assignmentRow = page.getByTestId("assignment-row").filter({ visible: true, hasText: title });
	await expect(assignmentRow).toBeVisible({ timeout: 10000 });
	await assignmentRow.getByRole("link", { name: "Submit Review" }).click();
	await page.waitForURL(/\/reviews\/[a-f0-9-]+/, { timeout: waitForUrlTimeout });
}
