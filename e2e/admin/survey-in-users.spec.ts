import * as XLSX from "xlsx";
import { createTestUser, deleteTestUser, getPrisma } from "../helpers/test-db";
import { expect, test } from "./fixtures";

// Verifies the survey feature surfaces in the admin Users area:
// always in the detail panel + XLSX export, and (when toggled) as a list column.
test.describe("Survey answers in Users area", () => {
	let stamp: string;
	let questionId: string;
	let selectQuestionId: string;
	let selectFieldName: string;
	let questionLabel: string;
	let listFieldName: string;
	let answerValue: string;
	let otherAnswerValue: string;
	let user: { id: string; email: string; firstName: string; lastName: string };
	let otherUser: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
	};

	test.beforeAll(async ({}, testInfo) => {
		const db = getPrisma();
		stamp = `${testInfo.workerIndex}-${Date.now()}`;
		questionLabel = `E2E survey-in-users ${stamp}`;
		listFieldName = `Diet ${stamp}`;
		answerValue = `VeganValue ${stamp}`;
		otherAnswerValue = `OmnivoreValue ${stamp}`;

		const question = await db.surveyQuestion.create({
			data: {
				label: questionLabel,
				type: "TEXT",
				orderIndex: 999,
				isActive: true,
				showInUsersList: true,
				fieldName: listFieldName,
			},
		});
		questionId = question.id;

		const firstName = "Survey";
		const lastName = `User${stamp}`;
		const created = await createTestUser({
			email: `survey-user-${stamp}@e2e.local`,
			firstName,
			lastName,
		});
		user = { id: created.id, email: created.email, firstName, lastName };

		await db.user.update({
			where: { id: user.id },
			data: { needInvoice: true, address: "ACME Corp, VAT PL123" },
		});
		await db.surveyAnswer.create({
			data: { userId: user.id, questionId, value: answerValue },
		});

		// Control user with a different answer — used to prove the column filter narrows.
		const otherCreated = await createTestUser({
			email: `survey-user-other-${stamp}@e2e.local`,
			firstName: "Survey",
			lastName: `Other${stamp}`,
		});
		otherUser = {
			id: otherCreated.id,
			email: otherCreated.email,
			firstName: "Survey",
			lastName: `Other${stamp}`,
		};
		await db.surveyAnswer.create({
			data: { userId: otherUser.id, questionId, value: otherAnswerValue },
		});

		// SINGLE_SELECT question with options → faceted (checkbox) filter in list.
		selectFieldName = `DietChoice ${stamp}`;
		const selectQuestion = await db.surveyQuestion.create({
			data: {
				label: `E2E survey-select ${stamp}`,
				type: "SINGLE_SELECT",
				options: ["Vegan", "Omnivore"],
				orderIndex: 998,
				isActive: true,
				showInUsersList: true,
				fieldName: selectFieldName,
			},
		});
		selectQuestionId = selectQuestion.id;
		await db.surveyAnswer.createMany({
			data: [
				{ userId: user.id, questionId: selectQuestionId, value: "Vegan" },
				{
					userId: otherUser.id,
					questionId: selectQuestionId,
					value: "Omnivore",
				},
			],
		});
	});

	test.afterAll(async () => {
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({
			where: { questionId: { in: [questionId, selectQuestionId] } },
		});
		await db.surveyQuestion
			.deleteMany({ where: { id: { in: [questionId, selectQuestionId] } } })
			.catch(() => {});
		await deleteTestUser(user.id).catch(() => {});
		await deleteTestUser(otherUser.id).catch(() => {});
	});

	test("field name appears as a list column with the user's answer", async ({
		adminUsersPage,
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name === "mobile-admin",
			"list column is desktop table only",
		);

		// Arrange
		await adminUsersPage.goto();
		await adminUsersPage.waitForLoad();

		// Assert — header + the user's row value
		await expect(
			page.getByRole("columnheader").filter({ hasText: listFieldName }),
		).toBeVisible();
		const row = await adminUsersPage.getRowByEmail(user);
		await expect(row).toContainText(answerValue);
	});

	test("survey column text filter narrows the list", async ({
		adminUsersPage,
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name === "mobile-admin",
			"column filter is desktop table only",
		);

		// Row locator by email that does NOT re-run the name search — so the only
		// narrowing between arrange and assert is the survey column filter itself.
		const rowByEmail = (email: string) =>
			page
				.getByTestId("user-row")
				.filter({ visible: true, has: page.locator(`text="${email}"`) });

		// Arrange — scope the list to both test users via the shared stamp (matches
		// both names), then confirm both rows are present.
		await adminUsersPage.goto();
		await adminUsersPage.waitForLoad();
		await adminUsersPage.search(stamp);
		await expect(rowByEmail(user.email)).toBeVisible();
		await expect(rowByEmail(otherUser.email)).toBeVisible();

		// Act — filter the survey column by this user's answer only
		await page
			.getByRole("columnheader")
			.filter({ hasText: listFieldName })
			.getByRole("button", { name: "Filter" })
			.click();
		await page
			.locator("[data-slot='popover-content']")
			.getByPlaceholder("Search...")
			.fill(answerValue);

		// Assert — the column filter (not a name search) leaves only the match
		await expect(rowByEmail(user.email)).toBeVisible();
		await expect(rowByEmail(otherUser.email)).toHaveCount(0);
	});

	test("survey faceted filter checkbox checks, narrows, and unchecks", async ({
		adminUsersPage,
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name === "mobile-admin",
			"faceted filter is desktop table only",
		);

		const rowByEmail = (email: string) =>
			page
				.getByTestId("user-row")
				.filter({ visible: true, has: page.locator(`text="${email}"`) });

		// Arrange — both users in scope
		await adminUsersPage.goto();
		await adminUsersPage.waitForLoad();
		await adminUsersPage.search(stamp);
		await expect(rowByEmail(user.email)).toBeVisible();
		await expect(rowByEmail(otherUser.email)).toBeVisible();

		// Open the faceted filter popover on the SINGLE_SELECT column
		await page
			.getByRole("columnheader")
			.filter({ hasText: selectFieldName })
			.getByRole("button", { name: "Filter" })
			.click();
		const popover = page.locator("[data-slot='popover-content']");
		const veganOption = popover.getByRole("checkbox", { name: "Vegan" });

		// Act — check "Vegan"
		await expect(veganOption).toHaveAttribute("aria-checked", "false");
		await veganOption.click();

		// Assert — option reflects checked state AND list narrows to the Vegan user
		await expect(veganOption).toHaveAttribute("aria-checked", "true");
		await expect(rowByEmail(user.email)).toBeVisible();
		await expect(rowByEmail(otherUser.email)).toHaveCount(0);

		// Act — uncheck "Vegan"
		await veganOption.click();

		// Assert — option clears and both users are visible again
		await expect(veganOption).toHaveAttribute("aria-checked", "false");
		await expect(rowByEmail(user.email)).toBeVisible();
		await expect(rowByEmail(otherUser.email)).toBeVisible();
	});

	test("user detail always shows the Survey Responses section", async ({
		page,
	}) => {
		// Act
		await page.goto(`/admin/users/${user.id}`);

		// Assert
		const section = page.getByTestId("user-survey-section");
		await expect(section).toBeVisible();
		await expect(section).toContainText(questionLabel);
		await expect(section).toContainText(answerValue);
	});

	test("XLSX export includes survey, Need Invoice and Invoice details columns", async ({
		page,
	}) => {
		// Act
		const response = await page.request.get("/api/admin/users/export");

		// Assert
		expect(response.status()).toBe(200);
		const wb = XLSX.read(await response.body(), { type: "buffer" });
		const sheet = wb.Sheets[wb.SheetNames[0]];
		const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
		const userRow = rows.find((r) => r.Email === user.email);

		expect(userRow).toBeTruthy();
		expect(userRow?.[listFieldName]).toBe(answerValue);
		expect(userRow?.["Need Invoice"]).toBe("True");
		expect(userRow?.["Invoice details"]).toContain("ACME Corp");
	});
});
