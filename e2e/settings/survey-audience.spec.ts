import { randomUUID } from "crypto";
import { baseUrlFor } from "../../playwright.config";
import {
	createExhibitorUser,
	deleteExhibitorUserByEmail,
	loginAsExhibitor,
	resetExhibitorConfig,
	setExhibitorConfig,
} from "../exhibitors/fixtures";
import { test, expect } from "../helpers/base-fixtures";
import { suppressPasskeyNudge } from "../helpers/page-setup";
import {
	ensureSeededSurveyQuestions,
	getPrisma,
	getTestUserIds,
} from "../helpers/test-db";

// Three questions, one per audience, plus the regular test user (an AUTHOR =
// participant) and a freshly created EXHIBITOR. The profile survey list is
// filtered server-side by role, so each viewer should see ALL + their audience.
test.describe.serial("Profile survey - audience filtering", () => {
	const suffix = randomUUID().slice(0, 8);
	const labels = {
		all: `e2e_aud_all_${suffix}`,
		participants: `e2e_aud_participants_${suffix}`,
		exhibitors: `e2e_aud_exhibitors_${suffix}`,
	};
	const exhibitorEmail = `exhibitor-audience-${suffix}@e2e.local`;

	test.beforeAll(async () => {
		const db = getPrisma();
		await db.surveyQuestion.deleteMany({
			where: { label: { in: Object.values(labels) } },
		});
		await db.surveyQuestion.createMany({
			data: [
				{ label: labels.all, orderIndex: 100, type: "CHECKBOX", audience: "ALL" },
				{
					label: labels.participants,
					orderIndex: 101,
					type: "CHECKBOX",
					audience: "PARTICIPANTS",
				},
				{
					label: labels.exhibitors,
					orderIndex: 102,
					type: "CHECKBOX",
					audience: "EXHIBITORS",
				},
			],
		});
	});

	test.afterAll(async () => {
		const db = getPrisma();
		await db.surveyAnswer.deleteMany({
			where: { question: { label: { in: Object.values(labels) } } },
		});
		await db.surveyQuestion.deleteMany({
			where: { label: { in: Object.values(labels) } },
		});
		await deleteExhibitorUserByEmail(exhibitorEmail).catch(() => {});
		await resetExhibitorConfig();
	});

	test("participant sees ALL + PARTICIPANTS questions, not EXHIBITORS", async ({
		page,
	}) => {
		// Arrange — keep the seeded required question answered so the form loads clean
		const { testUserId } = await getTestUserIds();
		await ensureSeededSurveyQuestions(testUserId);

		// Act
		await page.goto("/profile");
		await expect(
			page.getByRole("heading", { name: "Profile" }),
		).toBeVisible({ timeout: 15000 });

		// Assert
		await expect(page.getByText(labels.all)).toBeVisible();
		await expect(page.getByText(labels.participants)).toBeVisible();
		await expect(page.getByText(labels.exhibitors)).not.toBeVisible();
	});

	test("exhibitor sees ALL + EXHIBITORS questions, not PARTICIPANTS", async ({
		browser,
	}, testInfo) => {
		// Arrange — enable the feature and create an exhibitor account
		await setExhibitorConfig({ isActive: true });
		await createExhibitorUser(exhibitorEmail);

		// Fresh, signed-out context (empty storageState) so /login shows the form
		// rather than redirecting the project's signed-in test user to the dashboard.
		const context = await browser.newContext({
			baseURL: baseUrlFor(testInfo.parallelIndex),
			storageState: { cookies: [], origins: [] },
		});
		const page = await context.newPage();
		await suppressPasskeyNudge(page);
		try {
			await loginAsExhibitor(page, exhibitorEmail);

			// Act
			await page.goto("/profile");
			await expect(
				page.getByRole("heading", { name: "Profile" }),
			).toBeVisible({ timeout: 15000 });

			// Assert
			await expect(page.getByText(labels.all)).toBeVisible();
			await expect(page.getByText(labels.exhibitors)).toBeVisible();
			await expect(page.getByText(labels.participants)).not.toBeVisible();
		} finally {
			await context.close();
		}
	});
});
