import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
	createSession,
	deleteSession,
	getPrisma,
} from "../helpers/test-db";

/** Toggle enableSessionSelection in oral presentation config */
async function setSessionSelectionEnabled(enabled: boolean) {
	const db = getPrisma();
	const current = await db.appSetting.findUnique({
		where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
	});
	if (current) {
		const config =
			typeof current.value === "string"
				? JSON.parse(current.value)
				: (current.value as Record<string, unknown>);
		config.enableSessionSelection = enabled;
		await db.appSetting.update({
			where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
			data: { value: config },
		});
	}
}

test.describe.serial("Submission - Session Selection", () => {
	test("should show session selector when enabled for ABSTRACT", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const sessionId = await createSession(
			testRun.testRunId,
			"Neural Networks",
			undefined,
			true,
		);
		await setSessionSelectionEnabled(true);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");
		await page
			.getByRole("button", { name: /oral presentation/i })
			.click();

		// Assert - session selector should appear
		await expect(page.getByText("Preferred Session")).toBeVisible();

		// Should contain the active session in dropdown
		await page.getByRole("combobox").click();
		await expect(
			page.getByRole("option", {
				name: `${testRun.testRunId}_Neural Networks`,
			}),
		).toBeVisible();

		// Cleanup
		await deleteSession(sessionId);
		await setSessionSelectionEnabled(false);
	});

	test("should hide session selector when disabled", async ({ page }) => {
		// Arrange - ensure setting is off (default)
		await setSessionSelectionEnabled(false);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");
		await page
			.getByRole("button", { name: /oral presentation/i })
			.click();

		// Wait for form to render (title input visible)
		await expect(page.getByLabel("Title")).toBeVisible();

		// Assert - session selector should NOT appear
		await expect(page.getByText("Preferred Session")).not.toBeVisible();
	});

	test("should hide session selector for non-ABSTRACT types", async ({
		page,
	}) => {
		// Arrange - enable session selection so we can verify it's type-specific
		await setSessionSelectionEnabled(true);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");

		// Select POSTER
		await page
			.getByRole("button", { name: /poster/i })
			.click();
		await expect(page.getByLabel("Title")).toBeVisible();

		// Assert - no session selector for POSTER
		await expect(page.getByText("Preferred Session")).not.toBeVisible();

		// Select FULL PAPER
		await page
			.getByRole("button", { name: /full paper/i })
			.click();

		// Assert - no session selector for FULL_PAPER
		await expect(page.getByText("Preferred Session")).not.toBeVisible();

		// Cleanup
		await setSessionSelectionEnabled(false);
	});

	test("should load only active sessions", async ({ page, testRun }) => {
		// Arrange
		const activeSessionId = await createSession(
			testRun.testRunId,
			"Active Session",
			undefined,
			true,
		);
		const inactiveSessionId = await createSession(
			testRun.testRunId,
			"Inactive Session",
			undefined,
			false,
		);
		await setSessionSelectionEnabled(true);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");
		await page
			.getByRole("button", { name: /oral presentation/i })
			.click();
		await expect(page.getByText("Preferred Session")).toBeVisible();
		await page.getByRole("combobox").click();

		// Assert
		await expect(
			page.getByRole("option", {
				name: `${testRun.testRunId}_Active Session`,
			}),
		).toBeVisible();
		await expect(
			page.getByRole("option", {
				name: `${testRun.testRunId}_Inactive Session`,
			}),
		).not.toBeVisible();

		// Cleanup
		await deleteSession(activeSessionId);
		await deleteSession(inactiveSessionId);
		await setSessionSelectionEnabled(false);
	});
});
