import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
	createTrack,
	deleteTrack,
	getPrisma,
} from "../helpers/test-db";

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

		await expect(page.getByText("Preferred Track")).toBeVisible();

		await page.getByRole("combobox").filter({ hasText: "None" }).click();
		await expect(
			page.getByRole("option", {
				name: `${testRun.testRunId}_Neural Networks`,
			}),
		).toBeVisible();

		await deleteTrack(trackId);
		await setTrackSelectionEnabled(false);
	});

	test("should hide track selector when disabled", async ({ page }) => {
		await setTrackSelectionEnabled(false);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");
		await page
			.getByRole("button", { name: /oral presentation/i })
			.click();

		await expect(page.getByLabel("Title")).toBeVisible();

		await expect(page.getByText("Preferred Track")).not.toBeVisible();
	});

	test("should hide track selector for non-ABSTRACT types", async ({
		page,
	}) => {
		await setTrackSelectionEnabled(true);

		// Act - navigate fresh (bypass TanStack Router cache)
		await page.goto("/submissions");
		await page.goto("/submissions/new");

		await page
			.getByRole("button", { name: /poster/i })
			.click();
		await expect(page.getByLabel("Title")).toBeVisible();

		await expect(page.getByText("Preferred Track")).not.toBeVisible();

		await page
			.getByRole("button", { name: /full paper/i })
			.click();

		await expect(page.getByText("Preferred Track")).not.toBeVisible();

		await setTrackSelectionEnabled(false);
	});

	test("should load only active tracks", async ({ page, testRun }) => {
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
		await expect(page.getByText("Preferred Track")).toBeVisible({ timeout: 10000 });
		await page.getByRole("combobox").filter({ hasText: "None" }).click();

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

		// Guard: selecting a track shows its NAME in the trigger, not its stored cuid (Base UI value!=label regression)
		await page
			.getByRole("option", { name: `${testRun.testRunId}_Active Track` })
			.click();
		await expect(
			page
				.getByRole("combobox")
				.filter({ hasText: `${testRun.testRunId}_Active Track` }),
		).toBeVisible();

		await deleteTrack(activeTrackId);
		await deleteTrack(inactiveTrackId);
		await setTrackSelectionEnabled(false);
	});
});
