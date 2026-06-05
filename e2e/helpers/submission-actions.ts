import { expect, type Page } from "@playwright/test";

/**
 * Submission-detail actions live either as a contextual primary button or as
 * items in the "Actions" dropdown (sidebar). These helpers run/assert an action
 * regardless of which form it currently takes.
 */

const ACTIONS_TRIGGER = "submission-actions-trigger";

function primaryButton(page: Page, name: string) {
	return page.getByRole("button", { name, exact: true });
}

function menuItem(page: Page, name: string) {
	return page.getByRole("menuitem", { name, exact: true });
}

/** Trigger an action whether it is a primary button or a dropdown item. */
export async function runSubmissionAction(page: Page, name: string) {
	const primary = primaryButton(page, name);
	if (await primary.isVisible().catch(() => false)) {
		await primary.click();
		return;
	}
	await page.getByTestId(ACTIONS_TRIGGER).click();
	await menuItem(page, name).click();
}

/** Assert an action is available (as primary button or dropdown item). */
export async function expectActionAvailable(page: Page, name: string) {
	if (await primaryButton(page, name).isVisible().catch(() => false)) return;
	await page.getByTestId(ACTIONS_TRIGGER).click();
	await expect(menuItem(page, name)).toBeVisible();
	await page.keyboard.press("Escape");
}

/** Assert an action is NOT available (neither primary button nor dropdown item). */
export async function expectActionUnavailable(page: Page, name: string) {
	await expect(primaryButton(page, name)).toHaveCount(0);
	await page.getByTestId(ACTIONS_TRIGGER).click();
	await expect(menuItem(page, name)).toHaveCount(0);
	await page.keyboard.press("Escape");
}
