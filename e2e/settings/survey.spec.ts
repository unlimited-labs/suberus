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

		await page.goto("/profile");
		await expect(
			page.getByRole("heading", { name: "Profile" }),
		).toBeVisible({ timeout: 15000 });
	});

	test("user sees survey questions on settings page", async ({ page }) => {
		await expect(
			page.getByText("Please send me an Invitation Letter for a Visa Application."),
		).toBeVisible();
		await expect(
			page.getByText("I need a certificate of attendance."),
		).toBeVisible();
	});

	test("user toggles survey answers", async ({ page }) => {
		const visaCheckbox = page.getByRole("checkbox", { name: "Please send me an Invitation Letter for a Visa Application." });

		await visaCheckbox.check();

		await expect(visaCheckbox).toBeChecked();

		await visaCheckbox.uncheck();

		await expect(visaCheckbox).not.toBeChecked();
	});

	test("user saves survey answers", async ({ page }) => {
		const visaCheckbox = page.getByRole("checkbox", { name: "Please send me an Invitation Letter for a Visa Application." });

		await visaCheckbox.check();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();

		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("saved answers persist after page reload", async ({ page }) => {
		const visaCheckbox = page.getByRole("checkbox", { name: "Please send me an Invitation Letter for a Visa Application." });
		await visaCheckbox.check();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();

		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });
			await expect(
				page.getByRole("checkbox", { name: "Please send me an Invitation Letter for a Visa Application." }),
			).toBeChecked();
		}).toPass({ timeout: 30000 });

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
		const textInput = page.getByLabel("Dietary requirements");
		await expect(textInput).toBeVisible();

		await textInput.fill("Vegan diet");
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();

		await expect(page.getByText("Survey preferences saved")).toBeVisible();
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible();

		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });
			await expect(page.getByLabel("Dietary requirements")).toHaveValue("Vegan diet");
		}).toPass({ timeout: 30000 });

		await page.getByLabel("Dietary requirements").clear();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("user selects SINGLE_SELECT option", async ({ page }) => {
		await expect(page.getByText("Preferred session format")).toBeVisible();

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

		await expect(page.getByText("Survey preferences saved")).toBeVisible();
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible();

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
		await expect(page.getByText("Which days will you attend?")).toBeVisible();

		await page.getByRole("checkbox", { name: "Monday" }).check();
		await page.getByRole("checkbox", { name: "Wednesday" }).check();
		await page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" })
			.click();

		await expect(page.getByText("Survey preferences saved")).toBeVisible({ timeout: 10000 });
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible({ timeout: 15000 });

		await expect(async () => {
			await page.reload();
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });
			await expect(page.getByRole("checkbox", { name: "Monday" })).toBeChecked();
			await expect(page.getByRole("checkbox", { name: "Wednesday" })).toBeChecked();
			await expect(page.getByRole("checkbox", { name: "Tuesday" })).not.toBeChecked();
		}).toPass({ timeout: 30000 });

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

		await saveButton.click();

		await expect(page.getByText("This field is required")).toBeVisible();
		await expect(
			page.getByText("Survey preferences saved"),
		).not.toBeVisible();

		const trigger = page
			.getByTestId("survey-question-field")
			.filter({ hasText: /^Preferred session format/ })
			.getByRole("combobox");
		await trigger.click();
		await page.getByRole("option", { name: "Poster" }).click();
		await saveButton.click();

		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("user picks 'Other' in SINGLE_SELECT and free text persists", async ({
		page,
	}) => {
		const wrapper = page
			.getByTestId("survey-question-field")
			.filter({ hasText: /^Preferred session format/ });
		const saveButton = page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" });

		await wrapper.getByRole("combobox").click();
		await page.getByRole("option", { name: "Other" }).click();
		await wrapper.getByPlaceholder("Please specify...").fill("Gluten allergy");
		await saveButton.click();

		await expect(page.getByText("Survey preferences saved")).toBeVisible();
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible();

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

		await wrapper.getByRole("combobox").click();
		await page.getByRole("option", { name: "Poster" }).click();
		await saveButton.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("user picks 'Other' in MULTI_SELECT and free text persists", async ({
		page,
	}) => {
		const wrapper = page
			.getByTestId("survey-question-field")
			.filter({ hasText: /^Which days will you attend\?/ });
		const saveButton = page
			.locator("section")
			.filter({ hasText: "Survey" })
			.getByRole("button", { name: "Save changes" });

		await page.getByRole("checkbox", { name: "Other" }).check();
		await wrapper.getByPlaceholder("Please specify...").fill("Saturday");
		await saveButton.click();

		await expect(page.getByText("Survey preferences saved")).toBeVisible();
		await expect(page.getByText("Survey preferences saved")).not.toBeVisible();

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

		await page.getByRole("checkbox", { name: "Other" }).uncheck();
		await saveButton.click();
		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});

	test("required SINGLE_SELECT 'Other' with empty text blocks save", async ({
		page,
	}) => {
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

		await expect(wrapper.getByRole("combobox")).toContainText("Other");

		await saveButton.click();

		await expect(page.getByText("This field is required")).toBeVisible();
		await expect(
			page.getByText("Survey preferences saved"),
		).not.toBeVisible();

		await wrapper.getByRole("combobox").click();
		await page.getByRole("option", { name: "Poster" }).click();
		await saveButton.click();

		await expect(page.getByText("Survey preferences saved")).toBeVisible();
	});
});
