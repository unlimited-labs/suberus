import { randomUUID } from "crypto";
import { resetExhibitorConfig, setExhibitorConfig } from "../exhibitors/fixtures";
import { getPrisma } from "../helpers/test-db";
import { expect, RegisterPage, test } from "./fixtures";

// Registration survey is loaded before the account type is chosen, so audience
// filtering happens client-side against the selected type. Regression guard for
// the bug where PARTICIPANTS questions showed to exhibitor registrants (and
// EXHIBITORS questions never showed at all). One question per audience; each
// registrant must see ALL + their own audience only.
//
// Serial: enables the shared EXHIBITOR config (so the account-type selector
// appears) and seeds global questions; afterAll restores defaults.
test.describe.serial("Registration survey - audience filtering", () => {
	const suffix = randomUUID().slice(0, 8);
	const labels = {
		all: `e2e_reg_aud_all_${suffix}`,
		participants: `e2e_reg_aud_participants_${suffix}`,
		exhibitors: `e2e_reg_aud_exhibitors_${suffix}`,
	};

	test.beforeAll(async () => {
		await setExhibitorConfig({ isActive: true });
		const db = getPrisma();
		await db.surveyQuestion.deleteMany({
			where: { label: { in: Object.values(labels) } },
		});
		await db.surveyQuestion.createMany({
			data: [
				{ label: labels.all, orderIndex: 200, type: "CHECKBOX", audience: "ALL" },
				{
					label: labels.participants,
					orderIndex: 201,
					type: "CHECKBOX",
					audience: "PARTICIPANTS",
				},
				{
					label: labels.exhibitors,
					orderIndex: 202,
					type: "CHECKBOX",
					audience: "EXHIBITORS",
				},
			],
		});
	});

	test.afterAll(async () => {
		const db = getPrisma();
		await db.surveyQuestion.deleteMany({
			where: { label: { in: Object.values(labels) } },
		});
		await resetExhibitorConfig();
	});

	// Fill steps 1-2 as the given account type and land on step 3 (survey).
	async function gotoSurveyStep(
		registerPage: RegisterPage,
		accountType: "participant" | "exhibitor",
	) {
		await registerPage.goto();
		// The account-type selector only renders when the exhibitors feature is on.
		const typeRadio = registerPage.page.getByTestId(
			`register-account-type-${accountType}`,
		);
		await expect(typeRadio).toBeVisible({ timeout: 15000 });
		await typeRadio.click();

		await registerPage.fillStep1({
			email: `reg-aud-${accountType}-${suffix}@e2e.local`,
			password: "ValidPassword123!",
			confirmPassword: "ValidPassword123!",
			firstName: "Aud",
			lastName: "Tester",
			affiliation: "Test University",
		});
		await registerPage.clickContinue();
		await registerPage.fillStep2({
			country: "Poland",
			address: "Test Org\n123 Test St",
		});
		await registerPage.clickContinue();

		// Step 3 ready when the ALL question (shown to every audience) appears;
		// retry the continue click if the step transition raced.
		const allQuestion = registerPage.page.getByText(labels.all);
		try {
			await allQuestion.waitFor({ state: "visible", timeout: 8000 });
		} catch {
			await registerPage.clickContinue();
			await allQuestion.waitFor({ state: "visible", timeout: 10000 });
		}
	}

	test("participant registrant sees ALL + PARTICIPANTS, not EXHIBITORS", async ({
		registerPage,
	}) => {
		await gotoSurveyStep(registerPage, "participant");

		await expect(registerPage.page.getByText(labels.all)).toBeVisible();
		await expect(registerPage.page.getByText(labels.participants)).toBeVisible();
		await expect(
			registerPage.page.getByText(labels.exhibitors),
		).not.toBeVisible();
	});

	test("exhibitor registrant sees ALL + EXHIBITORS, not PARTICIPANTS", async ({
		registerPage,
	}) => {
		await gotoSurveyStep(registerPage, "exhibitor");

		await expect(registerPage.page.getByText(labels.all)).toBeVisible();
		await expect(registerPage.page.getByText(labels.exhibitors)).toBeVisible();
		await expect(
			registerPage.page.getByText(labels.participants),
		).not.toBeVisible();
	});
});
