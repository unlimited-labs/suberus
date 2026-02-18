import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
	createTrack,
	deleteTrack,
	getPrisma,
} from "../helpers/test-db";

/** Toggle enableTrackSelection in oral presentation config */
async function setTrackSelectionEnabled(enabled: boolean) {
	const db = getPrisma();
	const current = await db.appSetting.findUnique({
		where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
	});
	if (current) {
		const config =
			typeof current.value === "string"
				? JSON.parse(current.value)
				: (current.value as Record<string, unknown>);
		config.enableTrackSelection = enabled;
		await db.appSetting.update({
			where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
			data: { value: config },
		});
	}
}

test.describe.serial("Submission - Track Selection", () => {
	test("should show track selector when enabled for ABSTRACT", async ({
		page,
		testRun,
	}) => {
		// Arrange
		const trackId = await createTrack(
			testRun.testRunId,
			"Neural Networks",
			undefined,
			true,
		);
		await setTrackSelectionEnabled(true);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");
		await page
			.getByRole("button", { name: /oral presentation/i })
			.click();

		// Assert - track selector should appear
		await expect(page.getByText("Preferred Track")).toBeVisible();

		// Should contain the active track in dropdown
		await page.getByRole("combobox").filter({ hasText: "None" }).click();
		await expect(
			page.getByRole("option", {
				name: `${testRun.testRunId}_Neural Networks`,
			}),
		).toBeVisible();

		// Cleanup
		await deleteTrack(trackId);
		await setTrackSelectionEnabled(false);
	});

	test("should hide track selector when disabled", async ({ page }) => {
		// Arrange - ensure setting is off (default)
		await setTrackSelectionEnabled(false);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");
		await page
			.getByRole("button", { name: /oral presentation/i })
			.click();

		// Wait for form to render (title input visible)
		await expect(page.getByLabel("Title")).toBeVisible();

		// Assert - track selector should NOT appear
		await expect(page.getByText("Preferred Track")).not.toBeVisible();
	});

	test("should hide track selector for non-ABSTRACT types", async ({
		page,
	}) => {
		// Arrange - enable track selection so we can verify it's type-specific
		await setTrackSelectionEnabled(true);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");

		// Select POSTER
		await page
			.getByRole("button", { name: /poster/i })
			.click();
		await expect(page.getByLabel("Title")).toBeVisible();

		// Assert - no track selector for POSTER
		await expect(page.getByText("Preferred Track")).not.toBeVisible();

		// Select FULL PAPER
		await page
			.getByRole("button", { name: /full paper/i })
			.click();

		// Assert - no track selector for FULL_PAPER
		await expect(page.getByText("Preferred Track")).not.toBeVisible();

		// Cleanup
		await setTrackSelectionEnabled(false);
	});

	test("should load only active tracks", async ({ page, testRun }) => {
		// Arrange
		const activeTrackId = await createTrack(
			testRun.testRunId,
			"Active Track",
			undefined,
			true,
		);
		const inactiveTrackId = await createTrack(
			testRun.testRunId,
			"Inactive Track",
			undefined,
			false,
		);
		await setTrackSelectionEnabled(true);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");
		await page
			.getByRole("button", { name: /oral presentation/i })
			.click();
		await expect(page.getByText("Preferred Track")).toBeVisible();
		await page.getByRole("combobox").filter({ hasText: "None" }).click();

		// Assert
		await expect(
			page.getByRole("option", {
				name: `${testRun.testRunId}_Active Track`,
			}),
		).toBeVisible();
		await expect(
			page.getByRole("option", {
				name: `${testRun.testRunId}_Inactive Track`,
			}),
		).not.toBeVisible();

		// Cleanup
		await deleteTrack(activeTrackId);
		await deleteTrack(inactiveTrackId);
		await setTrackSelectionEnabled(false);
	});
});
