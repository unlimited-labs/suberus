import { createRoom } from "../../helpers/test-db";
import { expect, test } from "./fixtures";

test.describe.serial("Planner — Room filter", () => {
	test("toggles room column visibility via popover", async ({
		plannerPage,
		testRun,
	}) => {
		// sanityRoomId already creates one room; add a second so we can hide one
		const secondId = await createRoom(testRun.testRunId, "FilterHall");

		await plannerPage.goto();

		// Both rooms visible by default
		await expect(
			plannerPage.page.getByText(`${testRun.testRunId}_FilterHall`),
		).toBeVisible();

		// Open filter popover and hide FilterHall
		await plannerPage.roomFilterToggle.click();
		const checkbox = plannerPage.page.getByRole("checkbox", {
			name: `${testRun.testRunId}_FilterHall`,
		});
		await expect(checkbox).toBeVisible();
		await checkbox.click();

		// Close popover by clicking outside (use the toggle itself to close)
		await plannerPage.page.keyboard.press("Escape");

		// Column should be hidden
		await expect(
			plannerPage.page.getByRole("columnheader", {
				name: `${testRun.testRunId}_FilterHall`,
			}),
		).toBeHidden();

		// Badge shows reduced count
		await expect(plannerPage.roomFilterToggle).toContainText("1/2");

		// Clean up: restore visibility (for cleanup to work on shared state)
		await plannerPage.roomFilterToggle.click();
		await plannerPage.page.getByRole("button", { name: /show all/i }).click();
		void secondId;
	});
});
