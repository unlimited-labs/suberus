import { test, expect } from "../helpers/base-fixtures";

test.describe("User Settings - Survey", () => {
	// Survey save sends ALL answers — parallel tests overwrite each other
	test.describe.configure({ mode: "serial" });

	test.beforeEach(async ({ page }) => {
		// Arrange — navigate to profile
		await page.goto("/profile");
		await expect(
			page.getByRole("heading", { name: "Profile" }),
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

		// Assert — verify persistence after reload
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });
			await expect(
				page.getByLabel(
					"Please send me an Invitation Letter for a Visa Application.",
				),
			).toBeChecked();
		}).toPass({ timeout: 30000 });

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

	test("user fills TEXT survey question", async ({ page }) => {
		// Arrange
		const textInput = page.getByLabel("Dietary requirements");
		await expect(textInput).toBeVisible();

		// Act
		await textInput.fill("Vegan diet");
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();

		// Assert
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible();

		// Verify persistence
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });
			await expect(page.getByLabel("Dietary requirements")).toHaveValue("Vegan diet");
		}).toPass({ timeout: 30000 });

		// Cleanup
		await page.getByLabel("Dietary requirements").clear();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("user selects SINGLE_SELECT option", async ({ page }) => {
		// Arrange
		await expect(page.getByText("Preferred session format")).toBeVisible();

		// Act — open Select dropdown and pick "Poster"
		const trigger = page
			.locator("div")
			.filter({ hasText: /^Preferred session format/ })
			.getByRole("combobox");
		await trigger.click();
		await page.getByRole("option", { name: "Poster" }).click();

		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();

		// Assert — wait for save to complete
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible();

		// Verify persistence
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });
			await expect(
				page
					.locator("div")
					.filter({ hasText: /^Preferred session format/ })
					.getByRole("combobox"),
			).toContainText("Poster");
		}).toPass({ timeout: 30000 });
	});

	test("user selects MULTI_SELECT options", async ({ page }) => {
		// Arrange
		await expect(page.getByText("Which days will you attend?")).toBeVisible();

		// Act — check Monday and Wednesday
		await page.getByLabel("Monday").check();
		await page.getByLabel("Wednesday").check();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();

		// Assert — wait for save to complete
		await expect(page.getByText("Survey preferences saved")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible({ timeout: 15000 });

		// Verify persistence
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });
			await expect(page.getByLabel("Monday")).toBeChecked();
			await expect(page.getByLabel("Wednesday")).toBeChecked();
			await expect(page.getByLabel("Tuesday")).not.toBeChecked();
		}).toPass({ timeout: 30000 });

		// Cleanup
		await page.getByLabel("Monday").uncheck();
		await page.getByLabel("Wednesday").uncheck();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("required question blocks save until answered", async ({ page }) => {
		// Arrange — empty the seeded required answer directly in the DB
		const { getPrisma } = await import("../helpers/test-db");
		const db = getPrisma();
		const user = await db.user.findUnique({
			where: { email: "test@e2e.local" },
			select: { id: true },
		});
		const question = await db.surveyQuestion.findFirst({
			where: { label: "Preferred session format" },
			select: { id: true },
		});
		await db.surveyAnswer.updateMany({
			where: { userId: user?.id, questionId: question?.id },
			data: { value: "" },
		});

		await page.reload();
		await expect(
			page.getByRole("heading", { name: "Profile" }),
		).toBeVisible({ timeout: 15000 });

		const saveButton = page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" });

		// Act — attempt to save with the required SINGLE_SELECT empty
		await saveButton.click();

		// Assert — required error shown, nothing saved
		await expect(page.getByText("This field is required")).toBeVisible();
		await expect(
			page.getByText("Survey preferences saved"),
		).not.toBeVisible();

		// Act — answer it; save now succeeds (restores the seeded state)
		const trigger = page
			.locator("div")
			.filter({ hasText: /^Preferred session format/ })
			.getByRole("combobox");
		await trigger.click();
		await page.getByRole("option", { name: "Poster" }).click();
		await saveButton.click();

		// Assert
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});
});
