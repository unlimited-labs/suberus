import { test, expect } from "./fixtures";
import { setSchedulePublished } from "../../helpers/test-db";

test.describe.serial("Planner — Navigation", () => {
	test("Program link appears in navigation once schedule is published", async ({
		page,
	}) => {
		await setSchedulePublished(false);
		await page.goto("/admin/dashboard");
		await expect(page.getByRole("link", { name: /^Program$/i })).toBeHidden();

		await setSchedulePublished(true);
		await page.goto("/admin/dashboard");
		await expect(
			page.getByRole("link", { name: /^Program$/i }).first(),
		).toBeVisible({ timeout: 10000 });

		await setSchedulePublished(false);
	});

	test("Program Planner admin link is accessible", async ({ page }) => {
		await page.goto("/admin/program-planner");
		await expect(page).toHaveURL(/program-planner/);
	});
});
