import { test, expect, EDITOR_USER, TEST_USER } from "./fixtures"
import { loginAs } from "../helpers/auth"
import {
	createTestUser,
	deleteTestUser,
	getPrisma,
	getTestUserIds,
} from "../helpers/test-db"
import { SubmissionPage, VALID_SUBMISSION } from "../submissions/fixtures"

test.describe("Admin creates a submission on behalf of a participant", () => {
	const createdUserIds: string[] = []

	test.afterAll(async () => {
		for (const id of createdUserIds) {
			await deleteTestUser(id).catch(() => {})
		}
	})

	test("editor enters a submission owned by the participant", async ({
		page,
		userDetailPage,
		testRun,
	}) => {
		const participant = await createTestUser({
			email: `on-behalf-${testRun.testRunId}@e2e.local`,
			firstName: "Onbehalf",
			lastName: "Participant",
			affiliationName: `On-Behalf Affiliation ${testRun.testRunId}`,
			emailVerified: true,
			role: "AUTHOR",
		})
		createdUserIds.push(participant.id)

		await loginAs(page, EDITOR_USER, { clearCookies: true })
		await userDetailPage.goto(participant.id)

		const addButton = page.getByTestId("add-submission-on-behalf")
		await expect(addButton).toBeVisible()
		await addButton.click()
		await page.waitForURL(
			`**/admin/users/${participant.id}/submissions/new`,
		)

		const firstName = page.locator("#author-0-firstName")
		await expect(firstName).toHaveValue("Onbehalf", { timeout: 15000 })
		await expect(page.locator("#author-0-email")).toHaveValue(participant.email)

		const form = new SubmissionPage(page)
		const title = `${testRun.testRunId}_On Behalf Submission`
		await form.selectType("ABSTRACT")
		await form.fillTitle(title)
		await form.fillContent(VALID_SUBMISSION.content)
		for (const keyword of ["onbehalf", "e2e", "owner"]) {
			await form.addKeyword(keyword)
		}
		await form.submit()

		await page.waitForURL(`**/admin/users/${participant.id}`)

		const db = getPrisma()
		const submission = await db.submission.findFirst({ where: { title } })
		expect(submission).not.toBeNull()
		expect(submission?.userId).toBe(participant.id)
		expect(submission?.status).toBe("SUBMITTED")

		const { editorUserId } = await getTestUserIds()
		const log = await db.activityLog.findFirst({
			where: {
				submissionId: submission?.id,
				type: "SUBMISSION_CREATED",
			},
		})
		expect(log?.performedBy).toBe(editorUserId)

		await userDetailPage.goto(participant.id)
		await expect(
			page.getByTestId("user-submission-row").filter({ hasText: title }),
		).toBeVisible()
	})

	test("the header actions menu opens the on-behalf form", async ({
		page,
		userDetailPage,
		testRun,
	}) => {
		const participant = await createTestUser({
			email: `on-behalf-menu-${testRun.testRunId}@e2e.local`,
			firstName: "Menu",
			lastName: "Participant",
			emailVerified: true,
			role: "AUTHOR",
		})
		createdUserIds.push(participant.id)

		await loginAs(page, EDITOR_USER, { clearCookies: true })
		await userDetailPage.goto(participant.id)
		await userDetailPage.openActions()
		await page.getByTestId("add-submission-action").click()

		await page.waitForURL(
			`**/admin/users/${participant.id}/submissions/new`,
		)
		await expect(page.locator("#author-0-firstName")).toHaveValue("Menu", {
			timeout: 15000,
		})
	})

	test("a regular author cannot open the on-behalf route", async ({
		page,
	}) => {
		const { adminUserId } = await getTestUserIds()
		await loginAs(page, TEST_USER, { clearCookies: true })

		await page.goto(`/admin/users/${adminUserId}/submissions/new`)

		await expect(page).not.toHaveURL(/submissions\/new$/)
		await expect(page.getByLabel("Title")).toHaveCount(0)
	})
})
