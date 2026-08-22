import { createRoom } from "../../helpers/test-db";
import { expect, test } from "./fixtures";

test.describe.serial("Planner — Room filter", () => {
	test("toggles room column visibility via popover", async ({
		plannerPage,
		testRun,
	}) => {
		const secondId = await createRoom(testRun.testRunId, "FilterHall");

		await plannerPage.goto();

		await expect(
			plannerPage.page.getByText(`${testRun.testRunId}_FilterHall`),
		).toBeVisible();

		await plannerPage.roomFilterToggle.click();
		const checkbox = plannerPage.page.getByRole("checkbox", {
			name: `${testRun.testRunId}_FilterHall`,
		});
		await expect(checkbox).toBeVisible();
		await checkbox.click();

		await plannerPage.page.keyboard.press("Escape");

		await expect(
			plannerPage.page.getByRole("columnheader", {
				name: `${testRun.testRunId}_FilterHall`,
			}),
		).toBeHidden();

		await expect(plannerPage.roomFilterToggle).toContainText("1/2");

		await plannerPage.roomFilterToggle.click();
		await plannerPage.page.getByRole("button", { name: /show all/i }).click();
		void secondId;
	});
});
