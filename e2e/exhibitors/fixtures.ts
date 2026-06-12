import { type BrowserContext, type Page } from "@playwright/test";
import { expect, test as base } from "../helpers/base-fixtures";
import { baseUrlFor } from "../../playwright.config";
import { dismissViteOverlay } from "../helpers/page-setup";
import { UserRole } from "../../src/generated/prisma/enums";
import { DEFAULT_EXHIBITOR_CONFIG } from "../../src/lib/settings/defaults";
import type { SubmissionTypeConfig } from "../../src/lib/settings/types";
import {
	createTestUser,
	deleteTestUser,
	getPrisma,
	setAppSetting,
} from "../helpers/test-db";
import { DEFAULT_PASSWORD } from "../helpers/test-users";

/** Write the EXHIBITOR submission-type config directly to the worker DB (defaults + overrides). */
export async function setExhibitorConfig(
	overrides: Partial<SubmissionTypeConfig> = {},
) {
	await setAppSetting("SUBMISSION_TYPE_EXHIBITOR", {
		...DEFAULT_EXHIBITOR_CONFIG,
		...overrides,
	});
}

/** Restore the EXHIBITOR config to app defaults (feature disabled). */
export async function resetExhibitorConfig() {
	await setExhibitorConfig();
}

/** Create an EXHIBITOR user with an empty exhibitor profile (skips the UI signup). */
export async function createExhibitorUser(email: string) {
	const user = await createTestUser({
		email,
		firstName: "Exhibitor",
		lastName: "Tester",
		role: UserRole.EXHIBITOR,
	});
	const db = getPrisma();
	const exhibitor = await db.exhibitor.create({ data: { userId: user.id } });
	return { ...user, exhibitorId: exhibitor.id };
}

/** Delete an exhibitor test user and everything hanging off it (no-op if absent). */
export async function deleteExhibitorUserByEmail(email: string) {
	const db = getPrisma();
	const user = await db.user.findUnique({
		where: { email },
		select: { id: true },
	});
	if (!user) return;
	await db.exhibitor.deleteMany({ where: { userId: user.id } });
	await deleteTestUser(user.id);
}

/** Log in an EXHIBITOR user; they are redirected to /exhibitor after sign-in. */
export async function loginAsExhibitor(
	page: Page,
	email: string,
	password = DEFAULT_PASSWORD,
) {
	await page.goto("/login");
	await page.getByLabel("E-mail").waitFor({ state: "visible", timeout: 15000 });
	await page.getByLabel("E-mail").fill(email);
	const passwordInput = page.getByLabel("Password");
	await passwordInput.fill(password);
	await passwordInput.press("Enter");
	await page.waitForURL(/\/exhibitor/, { timeout: 30000 });
}

/** Fill the company name and submit the application; waits for "Awaiting decision". */
export async function submitExhibitorApplication(
	page: Page,
	companyName: string,
) {
	await page.getByTestId("exhibitor-company-name").fill(companyName);
	await page.getByTestId("exhibitor-submit").click();
	await expect(page.getByText("Application submitted")).toBeVisible({
		timeout: 10000,
	});
	await expect(page.getByTestId("exhibitor-status")).toContainText(
		"Awaiting decision",
	);
}

/** Approve/reject the exhibitor from the admin detail page (assumes the page shows the buttons). */
export async function decideExhibitor(
	adminPage: Page,
	decision: "approve" | "reject",
	reason: string,
) {
	await adminPage.getByTestId(`exhibitor-${decision}`).click();
	await adminPage.getByTestId("decide-exhibitor-reason").fill(reason);
	await adminPage.getByTestId("decide-exhibitor-confirm").click();
	await expect(
		adminPage.getByText(
			decision === "approve"
				? "Exhibitor application approved"
				: "Exhibitor application rejected",
		),
	).toBeVisible({ timeout: 10000 });
}

// Per-worker auth file for manually-built admin contexts (same pattern as
// e2e/submissions/settings-integration.spec.ts).
const workerAuth = (role: string, parallelIndex: number) =>
	`e2e/.auth/${role}-${parallelIndex}.json`;

interface ExhibitorFixtures {
	adminContext: BrowserContext;
	adminPage: Page;
}

export const test = base.extend<ExhibitorFixtures>({
	adminContext: async ({ browser }, use, testInfo) => {
		const context = await browser.newContext({
			baseURL: baseUrlFor(testInfo.parallelIndex),
			storageState: workerAuth("admin", testInfo.parallelIndex),
		});
		await use(context);
		await context.close();
	},
	adminPage: async ({ adminContext }, use) => {
		const page = await adminContext.newPage();
		await dismissViteOverlay(page);
		await use(page);
		await page.close();
	},
});

export { expect };
