import { test, expect } from "../helpers/base-fixtures";
import {
	ensureSeededSurveyQuestions,
	getTestUserIds,
} from "../helpers/test-db";

test.describe("User Settings - Survey", () => {
	// Survey save sends ALL answers — parallel tests overwrite each other
	test.describe.configure({ mode: "serial" });

	test.beforeEach(async ({ page }) => {
		// The seeded survey questions are global rows shared across projects on a
		// worker DB; a sibling spec can leave one missing/inactive (e.g. "Dietary
		// requirements" vanished under load). Re-assert them before each test.
		const { testUserId } = await getTestUserIds();
		await ensureSeededSurveyQuestions(testUserId);

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
		const visaCheckbox = page.getByRole("checkbox", { name: "Please send me an Invitation Letter for a Visa Application." });

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
		const visaCheckbox = page.getByRole("checkbox", { name: "Please send me an Invitation Letter for a Visa Application." });

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
		const visaCheckbox = page.getByRole("checkbox", { name: "Please send me an Invitation Letter for a Visa Application." });
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
				page.getByRole("checkbox", { name: "Please send me an Invitation Letter for a Visa Application." }),
			).toBeChecked();
		}).toPass({ timeout: 30000 });

		// Cleanup — uncheck and save
		await page
			.getByRole("checkbox", { name: "Please send me an Invitation Letter for a Visa Application." })
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
			.getByTestId("survey-question-field")
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
					.getByTestId("survey-question-field")
					.filter({ hasText: /^Preferred session format/ })
					.getByRole("combobox"),
			).toContainText("Poster");
		}).toPass({ timeout: 30000 });
	});

	test("user selects MULTI_SELECT options", async ({ page }) => {
		// Arrange
		await expect(page.getByText("Which days will you attend?")).toBeVisible();

		// Act — check Monday and Wednesday
		await page.getByRole("checkbox", { name: "Monday" }).check();
		await page.getByRole("checkbox", { name: "Wednesday" }).check();
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
			await expect(page.getByRole("checkbox", { name: "Monday" })).toBeChecked();
			await expect(page.getByRole("checkbox", { name: "Wednesday" })).toBeChecked();
			await expect(page.getByRole("checkbox", { name: "Tuesday" })).not.toBeChecked();
		}).toPass({ timeout: 30000 });

		// Cleanup
		await page.getByRole("checkbox", { name: "Monday" }).uncheck();
		await page.getByRole("checkbox", { name: "Wednesday" }).uncheck();
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
			.getByTestId("survey-question-field")
			.filter({ hasText: /^Preferred session format/ })
			.getByRole("combobox");
		await trigger.click();
		await page.getByRole("option", { name: "Poster" }).click();
		await saveButton.click();

		// Assert
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("user picks 'Other' in SINGLE_SELECT and free text persists", async ({
		page,
	}) => {
		// Arrange — scope to the single-select question wrapper
		const wrapper = page
			.getByTestId("survey-question-field")
			.filter({ hasText: /^Preferred session format/ });
		const saveButton = page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" });

		// Act — choose "Other" and type a free-text answer
		await wrapper.getByRole("combobox").click();
		await page.getByRole("option", { name: "Other" }).click();
		await wrapper.getByPlaceholder("Please specify...").fill("Gluten allergy");
		await saveButton.click();

		// Assert
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible();

		// Verify persistence — combobox shows Other, free text restored
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });
			await expect(wrapper.getByRole("combobox")).toContainText("Other");
			await expect(wrapper.getByPlaceholder("Please specify...")).toHaveValue(
				"Gluten allergy",
			);
		}).toPass({ timeout: 30000 });

		// Cleanup — restore the seeded "Poster" baseline
		await wrapper.getByRole("combobox").click();
		await page.getByRole("option", { name: "Poster" }).click();
		await saveButton.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("user picks 'Other' in MULTI_SELECT and free text persists", async ({
		page,
	}) => {
		// Arrange — scope to the multi-select question wrapper
		const wrapper = page
			.getByTestId("survey-question-field")
			.filter({ hasText: /^Which days will you attend\?/ });
		const saveButton = page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" });

		// Act — check "Other" and type a free-text answer
		await page.getByRole("checkbox", { name: "Other" }).check();
		await wrapper.getByPlaceholder("Please specify...").fill("Saturday");
		await saveButton.click();

		// Assert
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible();

		// Verify persistence
		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });
			await expect(page.getByRole("checkbox", { name: "Other" })).toBeChecked();
			await expect(wrapper.getByPlaceholder("Please specify...")).toHaveValue(
				"Saturday",
			);
		}).toPass({ timeout: 30000 });

		// Cleanup
		await page.getByRole("checkbox", { name: "Other" }).uncheck();
		await saveButton.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("required SINGLE_SELECT 'Other' with empty text blocks save", async ({
		page,
	}) => {
		// Arrange — set the required answer to an empty "Other" marker directly
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
			data: { value: "__other__:" },
		});

		await page.reload();
		await expect(
			page.getByRole("heading", { name: "Profile" }),
		).toBeVisible({ timeout: 15000 });

		const wrapper = page
			.getByTestId("survey-question-field")
			.filter({ hasText: /^Preferred session format/ });
		const saveButton = page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" });

		// Assert — "Other" is selected but its text box is empty
		await expect(wrapper.getByRole("combobox")).toContainText("Other");

		// Act — saving with empty "Other" text is blocked
		await saveButton.click();

		// Assert
		await expect(page.getByText("This field is required")).toBeVisible();
		await expect(
			page.getByText("Survey preferences saved"),
		).not.toBeVisible();

		// Act — answer it; save now succeeds (restores the seeded state)
		await wrapper.getByRole("combobox").click();
		await page.getByRole("option", { name: "Poster" }).click();
		await saveButton.click();

		// Assert
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});
});
