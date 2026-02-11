import { test, expect } from "../helpers/base-fixtures";

test.describe("User Settings - Survey", () => {
	test.beforeEach(async ({ page }) => {
		// Arrange — navigate to settings
		await page.goto("/settings");
		await expect(
			page.getByRole("heading", { name: "Settings" }),
		).toBeVisible({ timeout: 15000 });
	});

	test("user sees survey questions on settings page", async ({ page }) => {
		// Assert — seeded questions should be visible
		await expect(
			page.getByText("Please send me an Invitation Letter for a Visa Application."),
		).toBeVisible();
		await expect(
			page.getByText("I need a certificate of attendance."),
		).toBeVisible();
	});

	test("user toggles survey answers", async ({ page }) => {
		// Arrange
		const visaCheckbox = page.getByLabel(
			"Please send me an Invitation Letter for a Visa Application.",
		);

		// Act
		await visaCheckbox.check();

		// Assert
		await expect(visaCheckbox).toBeChecked();

		// Act — uncheck
		await visaCheckbox.uncheck();

		// Assert
		await expect(visaCheckbox).not.toBeChecked();
	});

	test("user saves survey answers", async ({ page }) => {
		// Arrange
		const visaCheckbox = page.getByLabel(
			"Please send me an Invitation Letter for a Visa Application.",
		);

		// Act
		await visaCheckbox.check();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();

		// Assert
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("saved answers persist after page reload", async ({ page }) => {
		// Arrange — check and save
		const visaCheckbox = page.getByLabel(
			"Please send me an Invitation Letter for a Visa Application.",
		);
		await visaCheckbox.check();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();

		// Act — reload
		await page.reload();
		await expect(
			page.getByRole("heading", { name: "Settings" }),
		).toBeVisible({ timeout: 15000 });

		// Assert
		await expect(
			page.getByLabel(
				"Please send me an Invitation Letter for a Visa Application.",
			),
		).toBeChecked();

		// Cleanup — uncheck and save
		await page
			.getByLabel(
				"Please send me an Invitation Letter for a Visa Application.",
			)
			.uncheck();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});
});
