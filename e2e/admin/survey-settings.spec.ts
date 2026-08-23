import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { ensureSeededSurveyQuestions, getPrisma } from "../helpers/test-db";

type AddOptions = {
	label: string;
	type?: "Checkbox" | "Text" | "Single select" | "Multi select";
	options?: string[];
	showInList?: string;
};

const TYPE_TESTID: Record<NonNullable<AddOptions["type"]>, string> = {
	Checkbox: "type-option-CHECKBOX",
	Text: "type-option-TEXT",
	"Single select": "type-option-SINGLE_SELECT",
	"Multi select": "type-option-MULTI_SELECT",
};

async function addQuestion(page: Page, opts: AddOptions) {
	await page.getByTestId("add-question-button").click();
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Question label").fill(opts.label);

	if (opts.type && opts.type !== "Checkbox") {
		await dialog.getByTestId(TYPE_TESTID[opts.type]).click();
	}

	for (let i = 0; i < (opts.options?.length ?? 0); i++) {
		await dialog.getByRole("button", { name: "Add option" }).click();
		await dialog.getByPlaceholder(`Option ${i + 1}`).fill(opts.options![i]);
	}

	if (opts.showInList) {
		await dialog.getByRole("switch", { name: "Show in users list" }).click();
		await dialog.getByLabel("Field name").fill(opts.showInList);
	}

	await dialog.getByRole("button", { name: "Add", exact: true }).click();
	await expect(page.getByText("Question added")).toBeVisible();
	// The dialog's exit is still running here; until it leaves the DOM a
	// pointerdown on the list below is swallowed (drag never starts).
	await expect(dialog).toHaveCount(0);
}

test.describe("Admin Settings - Survey Questions", () => {
	test.beforeEach(async ({ adminSettingsPage }, testInfo) => {
		// Seeded survey questions are global worker-DB rows shared across projects;
		// a sibling can leave one missing/inactive. Re-assert before asserting on them.
		await ensureSeededSurveyQuestions();

		await adminSettingsPage.goto();
		await adminSettingsPage.switchToSurveyTab(testInfo);
		await expect(
			adminSettingsPage.page.getByRole("heading", { name: "Survey Questions" }),
		).toBeVisible();
	});

	test("admin sees existing survey questions", async ({ page }) => {
		await expect(
			page.getByText("Please send me an Invitation Letter for a Visa Application."),
		).toBeVisible();
		await expect(
			page.getByText("I need a certificate of attendance."),
		).toBeVisible();
	});

	test("admin adds new question", async ({ page, testRun }) => {
		const newLabel = testRun.prefix("Do you need parking?");

		await addQuestion(page, { label: newLabel });

		await expect(page.getByText(newLabel)).toBeVisible();

		const db = getPrisma();
		await db.surveyAnswer.deleteMany({
			where: { question: { label: newLabel } },
		});
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });
	});

	test("admin edits question label", async ({ page, testRun }) => {
		const originalLabel = testRun.prefix("Editable question");
		const updatedLabel = testRun.prefix("Editable question (updated)");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: { in: [originalLabel, updatedLabel] } } } });
		await db.surveyQuestion.deleteMany({ where: { label: { in: [originalLabel, updatedLabel] } } });

		await addQuestion(page, { label: originalLabel });

		const row = page.getByTestId("question-row").filter({ hasText: originalLabel });
		await row.getByRole("button", { name: "Edit question" }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByLabel("Question label").fill(updatedLabel);
		await dialog.getByRole("button", { name: "Save" }).click();

		await expect(page.getByText("Question updated")).toBeVisible();
		await expect(page.getByText(updatedLabel)).toBeVisible();

		await db.surveyAnswer.deleteMany({ where: { question: { label: updatedLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: updatedLabel } });
	});

	test("admin toggles question active/inactive", async ({ page, testRun }) => {
		const tempLabel = testRun.prefix("Toggle question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: tempLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: tempLabel } });

		await addQuestion(page, { label: tempLabel });

		const row = page.getByTestId("question-row").filter({ hasText: tempLabel });
		const activeSwitch = row.getByRole("switch");
		await expect(activeSwitch).toBeChecked();

		await activeSwitch.click();

		await expect(activeSwitch).not.toBeChecked();

		await activeSwitch.click();
		await expect(activeSwitch).toBeChecked();

		await db.surveyAnswer.deleteMany({ where: { question: { label: tempLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: tempLabel } });
	});

	test("admin deletes question", async ({ page, testRun }) => {
		const deleteLabel = testRun.prefix("Temp question to delete");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: deleteLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: deleteLabel } });

		await addQuestion(page, { label: deleteLabel });

		const row = page.getByTestId("question-row").filter({ hasText: deleteLabel });
		await row.getByRole("button", { name: "Delete question" }).click();
		const dialog = page.getByRole("dialog");
		await expect(dialog).toContainText(deleteLabel);
		await dialog.getByRole("button", { name: "Delete", exact: true }).click();

		await expect(page.getByText("Question deleted")).toBeVisible();
		await expect(page.getByTestId("question-row").filter({ hasText: deleteLabel })).not.toBeVisible();
	});

	test("admin can cancel question deletion", async ({ page, testRun }) => {
		const keepLabel = testRun.prefix("Temp question to keep");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: keepLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: keepLabel } });

		await addQuestion(page, { label: keepLabel });

		const row = page.getByTestId("question-row").filter({ hasText: keepLabel });
		await row.getByRole("button", { name: "Delete question" }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("button", { name: "Cancel" }).click();

		await expect(dialog).not.toBeVisible();
		await expect(row).toBeVisible();
		expect(await db.surveyQuestion.count({ where: { label: keepLabel } })).toBe(1);

		await db.surveyQuestion.deleteMany({ where: { label: keepLabel } });
	});

	test("admin reorders questions by dragging", async ({ page, testRun }) => {
		const labelA = testRun.prefix("Reorder A");
		const labelB = testRun.prefix("Reorder B");
		const db = getPrisma();
		await db.surveyQuestion.deleteMany({ where: { label: { in: [labelA, labelB] } } });
		try {
			await addQuestion(page, { label: labelA });
			await addQuestion(page, { label: labelB });

			const rowA = page.getByTestId("question-row").filter({ hasText: labelA });
			const rowB = page.getByTestId("question-row").filter({ hasText: labelB });
			const yOf = async (row: Locator) => (await row.boundingBox())!.y;
			expect(await yOf(rowB)).toBeGreaterThan(await yOf(rowA));

			// dnd-kit pointer sensor: press B's handle, then walk the cursor up into
			// A's row in small steps so closestCenter swaps them.
			const a = (await rowA.boundingBox())!;
			const handle = (await rowB.getByLabel("Reorder question").boundingBox())!;
			await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
			await page.mouse.down();
			await page.mouse.move(handle.x + handle.width / 2, handle.y - 20, { steps: 5 });
			await page.mouse.move(a.x + a.width / 2, a.y + 4, { steps: 10 });
			await page.mouse.up();

			await expect(page.getByText("Failed to reorder").first()).not.toBeVisible();
			await expect(async () => {
				expect(await yOf(rowB)).toBeLessThan(await yOf(rowA));
			}).toPass({ timeout: 5000 });

			await expect
				.poll(async () => {
					const rows = await db.surveyQuestion.findMany({
						where: { label: { in: [labelA, labelB] } },
						orderBy: { orderIndex: "asc" },
						select: { label: true },
					});
					return rows.map((r) => r.label);
				})
				.toEqual([labelB, labelA]);
		} finally {
			await db.surveyQuestion.deleteMany({ where: { label: { in: [labelA, labelB] } } });
		}
	});

	test("admin sees type badges on seeded questions", async ({ page }) => {
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
		const newLabel = testRun.prefix("E2E Text Question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });

		await addQuestion(page, { label: newLabel, type: "Text" });

		const row = page.getByTestId("question-row").filter({ hasText: newLabel });
		await expect(row.getByText("Text", { exact: true })).toBeVisible();

		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });
	});

	test("admin adds SINGLE_SELECT question with options", async ({ page, testRun }) => {
		const newLabel = testRun.prefix("E2E Single Select Question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });

		await addQuestion(page, {
			label: newLabel,
			type: "Single select",
			options: ["Option A", "Option B", "Option C"],
		});

		const row = page.getByTestId("question-row").filter({ hasText: newLabel });
		await expect(row.getByText("Single", { exact: true })).toBeVisible();

		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });
	});

	test("admin adds MULTI_SELECT question with options", async ({ page, testRun }) => {
		const newLabel = testRun.prefix("E2E Multi Select Question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });

		await addQuestion(page, {
			label: newLabel,
			type: "Multi select",
			options: ["Day 1", "Day 2"],
		});

		const row = page.getByTestId("question-row").filter({ hasText: newLabel });
		await expect(row.getByText("Multi", { exact: true })).toBeVisible();

		await db.surveyAnswer.deleteMany({ where: { question: { label: newLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: newLabel } });
	});

	test("admin enables Show in users list with field name", async ({ page, testRun }) => {
		const label = testRun.prefix("Show-in-list question");
		const fieldName = testRun.prefix("Diet");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label } } });
		await db.surveyQuestion.deleteMany({ where: { label } });

		await addQuestion(page, { label, showInList: fieldName });

		await expect(
			page
				.getByTestId("question-row")
				.filter({ hasText: label })
				.getByText(`In list: ${fieldName}`),
		).toBeVisible();
		const saved = await db.surveyQuestion.findFirst({ where: { label } });
		expect(saved?.showInUsersList).toBe(true);
		expect(saved?.fieldName).toBe(fieldName);

		await db.surveyAnswer.deleteMany({ where: { question: { label } } });
		await db.surveyQuestion.deleteMany({ where: { label } });
	});

	test("admin edits existing question to enable Show in users list", async ({ page, testRun }) => {
		const label = testRun.prefix("Edit-to-show question");
		const fieldName = testRun.prefix("Parking");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label } } });
		await db.surveyQuestion.deleteMany({ where: { label } });

		await addQuestion(page, { label });

		const row = page.getByTestId("question-row").filter({ hasText: label });
		await row.getByRole("button", { name: "Edit question" }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByRole("switch", { name: "Show in users list" }).click();
		await dialog.getByLabel("Field name").fill(fieldName);
		await dialog.getByRole("button", { name: "Save" }).click();

		await expect(page.getByText("Question updated")).toBeVisible();
		await expect(
			page
				.getByTestId("question-row")
				.filter({ hasText: label })
				.getByText(`In list: ${fieldName}`),
		).toBeVisible();
		const saved = await db.surveyQuestion.findFirst({ where: { label } });
		expect(saved?.showInUsersList).toBe(true);
		expect(saved?.fieldName).toBe(fieldName);

		await db.surveyAnswer.deleteMany({ where: { question: { label } } });
		await db.surveyQuestion.deleteMany({ where: { label } });
	});

	test("toggle Show in users list ON without field name is rejected", async ({ page, testRun }) => {
		const label = testRun.prefix("No-fieldname question");
		const db = getPrisma();
		await db.surveyQuestion.deleteMany({ where: { label } });

		await page.getByTestId("add-question-button").click();
		const dialog = page.getByRole("dialog");
		await dialog.getByLabel("Question label").fill(label);

		await dialog.getByRole("switch", { name: "Show in users list" }).click();
		await dialog.getByRole("button", { name: "Add", exact: true }).click();

		await expect(
			dialog.getByText("Field name is required to show in users list"),
		).toBeVisible();
		expect(await db.surveyQuestion.count({ where: { label } })).toBe(0);
	});

	test("admin imports a question template", async ({ page }) => {
		const importedLabel = "Dietary requirements";
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: importedLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: importedLabel } });

		await page.getByTestId("import-template-button").click();
		const dialog = page.getByRole("dialog");
		await dialog.getByTestId("template-card").filter({ hasText: "Dietary" }).click();

		await expect(page.getByText("Template imported")).toBeVisible();
		const row = page.getByTestId("question-row").filter({ hasText: importedLabel });
		await expect(row.getByText("Multi", { exact: true })).toBeVisible();
		const saved = await db.surveyQuestion.findFirst({ where: { label: importedLabel } });
		expect(saved?.type).toBe("MULTI_SELECT");
		expect(saved?.allowOther).toBe(true);
		expect(saved?.options).toContain("Vegan");

		await db.surveyAnswer.deleteMany({ where: { question: { label: importedLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: importedLabel } });
	});

	test("admin edits question type", async ({ page, testRun }) => {
		const tempLabel = testRun.prefix("Type change question");
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label: tempLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: tempLabel } });

		await addQuestion(page, { label: tempLabel });

		const editRow = page.getByTestId("question-row").filter({ hasText: tempLabel });
		await editRow.getByRole("button", { name: "Edit question" }).click();
		const dialog = page.getByRole("dialog");
		await dialog.getByTestId("type-option-TEXT").click();
		await dialog.getByRole("button", { name: "Save" }).click();

		await expect(page.getByText("Question updated")).toBeVisible();
		const row = page.getByTestId("question-row").filter({ hasText: tempLabel });
		await expect(row.getByText("Text", { exact: true })).toBeVisible();

		await db.surveyAnswer.deleteMany({ where: { question: { label: tempLabel } } });
		await db.surveyQuestion.deleteMany({ where: { label: tempLabel } });
	});
});
