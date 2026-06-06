import * as XLSX from "xlsx";
import { createTestUser, deleteTestUser, getPrisma } from "../helpers/test-db";
import { expect, test } from "./fixtures";

// Verifies the survey feature surfaces in the admin Users area:
// always in the detail panel + XLSX export, and (when toggled) as a list column.
test.describe("Survey answers in Users area", () => {
	let questionId: string;
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
		const stamp = `${testInfo.workerIndex}-${Date.now()}`;
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
	});

	test.afterAll(async () => {
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({ where: { questionId } });
		await db.surveyQuestion.delete({ where: { id: questionId } }).catch(() => {});
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

		// Arrange — both users visible
		await adminUsersPage.goto();
		await adminUsersPage.waitForLoad();
		await expect(await adminUsersPage.getRowByEmail(user)).toBeVisible();
		await expect(await adminUsersPage.getRowByEmail(otherUser)).toBeVisible();

		// Act — filter the survey column by this user's answer
		await page
			.getByRole("columnheader")
			.filter({ hasText: listFieldName })
			.getByRole("button", { name: "Filter" })
			.click();
		await page
			.locator("[data-slot='popover-content']")
			.getByPlaceholder("Search...")
			.fill(answerValue);

		// Assert — only the matching user remains
		await expect(await adminUsersPage.getRowByEmail(user)).toBeVisible();
		await expect(await adminUsersPage.getRowByEmail(otherUser)).toHaveCount(0);
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
