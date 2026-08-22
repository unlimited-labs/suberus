import { test, expect, EDITOR_USER } from "./fixtures"
import { loginAs } from "../helpers/auth"
import {
	createTestUser,
	deleteTestUser,
	ensureSeededSurveyQuestions,
	getPrisma,
} from "../helpers/test-db"

const DIETARY = "Dietary requirements"
const FORMAT = "Preferred session format"

test.describe("Admin edits a user's survey answers", () => {
	const createdUserIds: string[] = []

	test.beforeEach(async () => {
		await ensureSeededSurveyQuestions()
	})

	test.afterAll(async () => {
		for (const id of createdUserIds) {
			await deleteTestUser(id).catch(() => {})
		}
	})

	test("editor fills an unanswered survey question on behalf of the user", async ({
		page,
		userDetailPage,
		testRun,
	}) => {
		const db = getPrisma()
		const participant = await createTestUser({
			email: `survey-edit-${testRun.testRunId}@e2e.local`,
			firstName: "Survey",
			lastName: "Target",
			emailVerified: true,
			role: "AUTHOR",
		})
		createdUserIds.push(participant.id)

		const formatQ = await db.surveyQuestion.findFirstOrThrow({
			where: { label: FORMAT },
		})
		const dietaryQ = await db.surveyQuestion.findFirstOrThrow({
			where: { label: DIETARY },
		})
		await db.surveyAnswer.create({
			data: { userId: participant.id, questionId: formatQ.id, value: "Oral" },
		})

		await loginAs(page, EDITOR_USER, { clearCookies: true })
		await userDetailPage.goto(participant.id)

		await page.getByTestId("edit-survey-answers").click()
		const dialog = page.getByRole("dialog")
		await expect(dialog).toBeVisible()

		await dialog.getByLabel(DIETARY).fill("Vegan")
		await dialog.getByRole("button", { name: "Save answers" }).click()

		await expect(dialog).toHaveCount(0)

		const answers = await db.surveyAnswer.findMany({
			where: { userId: participant.id },
		})
		const dietary = answers.find((a) => a.questionId === dietaryQ.id)
		const format = answers.find((a) => a.questionId === formatQ.id)
		expect(dietary?.value).toBe("Vegan")
		expect(format?.value).toBe("Oral")

		await expect(page.getByTestId("user-survey-section")).toContainText("Vegan")
	})
})
