import { randomUUID } from "crypto";
import {
	resetExhibitorConfig,
	setExhibitorConfig,
} from "../exhibitors/fixtures";
import { getPrisma } from "../helpers/test-db";
import { expect, test } from "./fixtures";

// Mutates the shared EXHIBITOR config — keep serial; afterAll restores defaults.
test.describe.serial("Admin Settings - Survey question audience", () => {
	const label = `e2e_audience_${randomUUID().slice(0, 8)}`;

	test.afterAll(async () => {
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { question: { label } } });
		await db.surveyQuestion.deleteMany({ where: { label } });
		await resetExhibitorConfig();
	});

	test("audience picker is hidden when exhibitors feature is disabled", async ({
		adminSettingsPage,
	}, testInfo) => {
		// Arrange — feature off
		await resetExhibitorConfig();
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToSurveyTab(testInfo);

		// Act — open the add dialog
		await adminSettingsPage.page.getByTestId("add-question-button").click();
		const dialog = adminSettingsPage.page.getByRole("dialog");
		await expect(dialog.getByLabel("Question label")).toBeVisible();

		// Assert — no audience control
		await expect(dialog.getByTestId("audience-picker")).not.toBeVisible();
	});

	test("audience picker appears when enabled; exhibitor-only question persists and shows a badge", async ({
		adminSettingsPage,
	}, testInfo) => {
		// Arrange — enable exhibitors, then load the survey tab fresh
		await setExhibitorConfig({ isActive: true });
		const page = adminSettingsPage.page;
		await adminSettingsPage.goto();
		await adminSettingsPage.switchToSurveyTab(testInfo);

		// Act — add a question targeted at exhibitors only
		await page.getByTestId("add-question-button").click();
		const dialog = page.getByRole("dialog");
		await dialog.getByLabel("Question label").fill(label);
		await expect(dialog.getByTestId("audience-picker")).toBeVisible();
		await dialog.getByTestId("audience-option-EXHIBITORS").click();
		await dialog.getByRole("button", { name: "Add", exact: true }).click();

		// Assert — toast, row badge, and persisted audience
		await expect(page.getByText("Question added")).toBeVisible();
		const row = page.getByTestId("question-row").filter({ hasText: label });
		await expect(row.getByText("Exhibitors")).toBeVisible();
		const db = getPrisma();
		const saved = await db.surveyQuestion.findFirst({ where: { label } });
		expect(saved?.audience).toBe("EXHIBITORS");
	});
});
