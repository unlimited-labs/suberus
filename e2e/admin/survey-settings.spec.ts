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

	test("admin adds new question", async ({ page }) => {
		// Arrange
		const newLabel = "Do you need parking?";

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

	test("admin edits question label", async ({ page }) => {
		// Arrange
		const originalLabel = "I need a certificate of attendance.";
		const updatedLabel = "I need a certificate of attendance (updated).";

		// Act — click label to edit
		await page.getByRole("button", { name: originalLabel }).click();
		const input = page.getByRole("textbox").first();
		await input.clear();
		await input.fill(updatedLabel);
		await page.getByRole("button", { name: "Save" }).first().click();

		// Assert
		await expect(page.getByText("Question updated")).toBeVisible();
		await expect(page.getByText(updatedLabel)).toBeVisible();

		// Cleanup — restore original label
		const db = getPrisma();
		await db.surveyQuestion.updateMany({
			where: { label: updatedLabel },
			data: { label: originalLabel },
		});
	});

	test("admin toggles question active/inactive", async ({ page }) => {
		// Arrange — find the first active switch
		const firstSwitch = page.getByRole("switch").first();
		await expect(firstSwitch).toBeChecked();

		// Act — deactivate
		await firstSwitch.click();

		// Assert
		await expect(firstSwitch).not.toBeChecked();

		// Cleanup — reactivate
		await firstSwitch.click();
		await expect(firstSwitch).toBeChecked();
	});

	test("admin deletes question", async ({ page }) => {
		// Arrange — clean up any leftovers from previous retries
		const deleteLabel = "Temporary question to delete";
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
		await expect(secondRow.getByRole("button", { name: "Move up" })).toBeEnabled();

		// Act — move second question up
		await secondRow.getByRole("button", { name: "Move up" }).click();

		// Assert — no error toast
		await expect(page.getByText("Failed to reorder")).not.toBeVisible();

		// Cleanup — restore original order
		const db = getPrisma();
		const visaQ = await db.surveyQuestion.findFirst({ where: { label: { contains: "Visa" } } });
		const certQ = await db.surveyQuestion.findFirst({ where: { label: { contains: "certificate" } } });
		if (visaQ && certQ) {
			await db.surveyQuestion.update({ where: { id: visaQ.id }, data: { orderIndex: 0 } });
			await db.surveyQuestion.update({ where: { id: certQ.id }, data: { orderIndex: 1 } });
		}
	});
});
