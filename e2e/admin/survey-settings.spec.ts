import { test, expect } from "./fixtures";
import { getPrisma } from "../helpers/test-db";

test.describe("Admin Settings - Survey Questions", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		// Arrange
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToSurveyTab(testInfo);
		await expect(
			adminSettingsPage.page.getByRole("heading", { name: "Survey Questions" }),
		).toBeVisible();
	});

	test("admin sees existing survey questions", async ({ page }) => {
		// Assert — seeded in global setup
		await expect(
			page.getByText("Please send me an Invitation Letter for a Visa Application."),
		).toBeVisible();
		await expect(
			page.getByText("I need a certificate of attendance."),
		).toBeVisible();
	});

	test("admin adds new question", async ({ page, testRun }) => {
		// Arrange
		const newLabel = testRun.prefix("Do you need parking?");

		// Act
		await page.getByPlaceholder("New question label...").fill(newLabel);
		await page.getByRole("button", { name: "Add" }).click();

		// Assert
		await expect(page.getByText("Question added")).toBeVisible();
		await expect(page.getByText(newLabel)).toBeVisible();

		// Cleanup
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({
			where: { question: { label: newLabel } },
		});
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });
	});

	test("admin edits question label", async ({ page, testRun }) => {
		// Arrange — create a temp question to avoid modifying seeded data
		const originalLabel = testRun.prefix("Editable question");
		const updatedLabel = testRun.prefix("Editable question (updated)");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: { in: [originalLabel, updatedLabel] } } } });
		await db.surveyQuestion.deleteMany({ where: { label: { in: [originalLabel, updatedLabel] } } });

		await page.getByPlaceholder("New question label...").fill(originalLabel);
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Question added")).toBeVisible();

		// Act — click label to edit
		await page.getByRole("button", { name: originalLabel }).click();
		const editRow = page.getByTestId("question-row").filter({
			has: page.getByRole("button", { name: "Save" }),
		});
		const input = editRow.getByRole("textbox").first();
		await input.clear();
		await input.fill(updatedLabel);
		await editRow.getByRole("button", { name: "Save" }).click();

		// Assert
		await expect(page.getByText("Question updated")).toBeVisible();
		await expect(page.getByText(updatedLabel)).toBeVisible();

		// Cleanup
		await db.surveyAnswer.deleteMany({ where: { question: { label: updatedLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: updatedLabel } });
	});

	test("admin toggles question active/inactive", async ({ page, testRun }) => {
		// Arrange — create a temp question to avoid modifying seeded data
		const tempLabel = testRun.prefix("Toggle question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: tempLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: tempLabel } });

		await page.getByPlaceholder("New question label...").fill(tempLabel);
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Question added")).toBeVisible();

		// Arrange — find the switch on the new question's row
		const row = page.getByTestId("question-row").filter({ hasText: tempLabel });
		const activeSwitch = row.getByRole("switch");
		await expect(activeSwitch).toBeChecked();

		// Act — deactivate
		await activeSwitch.click();

		// Assert
		await expect(activeSwitch).not.toBeChecked();

		// Act — reactivate
		await activeSwitch.click();
		await expect(activeSwitch).toBeChecked();

		// Cleanup
		await db.surveyAnswer.deleteMany({ where: { question: { label: tempLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: tempLabel } });
	});

	test("admin deletes question", async ({ page, testRun }) => {
		// Arrange — clean up any leftovers from previous retries
		const deleteLabel = testRun.prefix("Temp question to delete");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: deleteLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: deleteLabel } });

		// Arrange — create a question to delete
		await page.getByPlaceholder("New question label...").fill(deleteLabel);
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Question added")).toBeVisible();

		// Act — find the row by data-testid and delete
		const row = page.getByTestId("question-row").filter({ hasText: deleteLabel });
		await row.getByRole("button", { name: "Delete question" }).click();

		// Assert
		await expect(page.getByText("Question deleted")).toBeVisible();
		await expect(page.getByTestId("question-row").filter({ hasText: deleteLabel })).not.toBeVisible();
	});

	test("admin reorders questions with up/down arrows", async ({ page }) => {
		// Arrange — second row always has "Move up" enabled
		const secondRow = page.getByTestId("question-row").nth(1);
		await expect(secondRow.getByRole("button", { name: "Move up" })).toBeEnabled({ timeout: 10000 });

		// Act — move second question up (retry if server race condition)
		await expect(async () => {
			await secondRow.getByRole("button", { name: "Move up" }).click();
			await expect(page.getByText("Failed to reorder").first()).not.toBeVisible();
		}).toPass({ timeout: 10000 });

		// Cleanup — move it back down to restore original order
		const firstRow = page.getByTestId("question-row").nth(0);
		await expect(async () => {
			await firstRow.getByRole("button", { name: "Move down" }).click();
			await expect(page.getByText("Failed to reorder").first()).not.toBeVisible();
		}).toPass({ timeout: 10000 });
	});

	test("admin sees type badges on seeded questions", async ({ page }) => {
		// Assert — seeded questions display correct type badges
		const checkboxRow = page.getByTestId("question-row").filter({ hasText: "Visa" });
		await expect(checkboxRow.getByText("Checkbox")).toBeVisible();

		const textRow = page.getByTestId("question-row").filter({ hasText: "Dietary" });
		await expect(textRow.getByText("Text")).toBeVisible();

		const singleRow = page.getByTestId("question-row").filter({ hasText: "Preferred session" });
		await expect(singleRow.getByText("Single")).toBeVisible();
		await expect(singleRow.getByText("Required")).toBeVisible();

		const multiRow = page.getByTestId("question-row").filter({ hasText: "Which days" });
		await expect(multiRow.getByText("Multi")).toBeVisible();
	});

	test("admin adds TEXT question", async ({ page, testRun }) => {
		// Arrange
		const newLabel = testRun.prefix("E2E Text Question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });

		// Act
		const addSection = page.getByTestId("add-question-section");
		await addSection.getByPlaceholder("New question label...").fill(newLabel);
		await addSection.getByRole("combobox").click();
		await page.getByRole("option", { name: "Text" }).click();
		await addSection.getByRole("button", { name: "Add", exact: true }).click();

		// Assert
		await expect(page.getByText("Question added")).toBeVisible();
		const row = page.getByTestId("question-row").filter({ hasText: newLabel });
		await expect(row.getByText("Text", { exact: true })).toBeVisible();

		// Cleanup
		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });
	});

	test("admin adds SINGLE_SELECT question with options", async ({ page, testRun }) => {
		// Arrange
		const newLabel = testRun.prefix("E2E Single Select Question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });

		// Act
		const addSection = page.getByTestId("add-question-section");
		await addSection.getByPlaceholder("New question label...").fill(newLabel);
		await addSection.getByRole("combobox").click();
		await page.getByRole("option", { name: "Single Select" }).click();

		// Add options
		await addSection.getByRole("button", { name: "Add option" }).click();
		await addSection.getByPlaceholder("Option 1").fill("Option A");
		await addSection.getByRole("button", { name: "Add option" }).click();
		await addSection.getByPlaceholder("Option 2").fill("Option B");
		await addSection.getByRole("button", { name: "Add option" }).click();
		await addSection.getByPlaceholder("Option 3").fill("Option C");

		await addSection.getByRole("button", { name: "Add", exact: true }).click();

		// Assert
		await expect(page.getByText("Question added")).toBeVisible();
		const row = page.getByTestId("question-row").filter({ hasText: newLabel });
		await expect(row.getByText("Single", { exact: true })).toBeVisible();

		// Cleanup
		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });
	});

	test("admin adds MULTI_SELECT question with options", async ({ page, testRun }) => {
		// Arrange
		const newLabel = testRun.prefix("E2E Multi Select Question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });

		// Act
		const addSection = page.getByTestId("add-question-section");
		await addSection.getByPlaceholder("New question label...").fill(newLabel);
		await addSection.getByRole("combobox").click();
		await page.getByRole("option", { name: "Multi Select" }).click();

		// Add options
		await addSection.getByRole("button", { name: "Add option" }).click();
		await addSection.getByPlaceholder("Option 1").fill("Day 1");
		await addSection.getByRole("button", { name: "Add option" }).click();
		await addSection.getByPlaceholder("Option 2").fill("Day 2");

		await addSection.getByRole("button", { name: "Add", exact: true }).click();

		// Assert
		await expect(page.getByText("Question added")).toBeVisible();
		const row = page.getByTestId("question-row").filter({ hasText: newLabel });
		await expect(row.getByText("Multi", { exact: true })).toBeVisible();

		// Cleanup
		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });
	});

	test("admin edits question type", async ({ page, testRun }) => {
		// Arrange — create a temp question to avoid modifying seeded data
		const tempLabel = testRun.prefix("Type change question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: tempLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: tempLabel } });

		await page.getByPlaceholder("New question label...").fill(tempLabel);
		await page.getByRole("button", { name: "Add" }).click();
		await expect(page.getByText("Question added")).toBeVisible();

		// Act — click label to edit, then change type to TEXT
		await page.getByRole("button", { name: tempLabel }).click();
		const editRow = page.getByTestId("question-row").filter({
			has: page.getByRole("button", { name: "Save" }),
		});
		const editTypeSelect = editRow.getByRole("combobox").first();
		await editTypeSelect.click();
		await page.getByRole("option", { name: "Text" }).click();

		await editRow.getByRole("button", { name: "Save" }).click();

		// Assert
		await expect(page.getByText("Question updated")).toBeVisible();
		const row = page.getByTestId("question-row").filter({ hasText: tempLabel });
		await expect(row.getByText("Text", { exact: true })).toBeVisible();

		// Cleanup
		await db.surveyAnswer.deleteMany({ where: { question: { label: tempLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: tempLabel } });
	});
});
