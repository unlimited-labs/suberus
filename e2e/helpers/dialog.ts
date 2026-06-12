import { type Page } from "@playwright/test";

/** Wait for a confirming action to settle: the dialog hides or a toast appears. */
export async function waitForDialogToClose(page: Page) {
	await Promise.race([
		page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15000 }),
		page.locator("[data-sonner-toast]").waitFor({ state: "visible", timeout: 15000 }),
	]);
}
