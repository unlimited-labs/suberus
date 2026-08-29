import { EDITOR_USER, expect, test } from "./fixtures"
import { loginAs } from "../helpers/auth"
import {
	createSubmission,
	createTestUser,
	deleteTestUser,
	getPrisma,
} from "../helpers/test-db"
import { SubmissionStatus } from "../../src/generated/prisma/enums"
import { runSubmissionAction } from "../helpers/submission-actions"

test.describe("Admin changes a submission's submitter", () => {
	const createdUserIds: string[] = []

	test.afterAll(async () => {
		for (const id of createdUserIds) {
			await deleteTestUser(id).catch(() => {})
		}
	})

	test("editor hands the submission to another account", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const newOwner = await createTestUser({
			email: `new-submitter-${testRun.testRunId}@e2e.local`,
			firstName: "Newsub",
			lastName: "Owner",
			emailVerified: true,
			role: "AUTHOR",
		})
		createdUserIds.push(newOwner.id)

		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Change Submitter Target",
			status: SubmissionStatus.SUBMITTED,
			keywords: ["ownership", "e2e", "submitter"],
		})
		cleanup.track(sub.id)

		await loginAs(page, EDITOR_USER, { clearCookies: true })
		await page.goto(`/admin/submissions/${sub.id}`)
		await page.getByRole("heading", { name: sub.title }).waitFor({ timeout: 10000 })

		await runSubmissionAction(page, "Change submitter")

		const dialog = page.getByRole("dialog")
		await dialog.getByPlaceholder("Search by name, email, or affiliation...").fill(newOwner.email)
		await dialog
			.getByTestId("submitter-option")
			.filter({ hasText: newOwner.email })
			.getByRole("button", { name: "Make submitter" })
			.click()

		await expect(page.getByTestId("submission-submitter-link")).toHaveText("Newsub Owner")

		const db = getPrisma()
		const moved = await db.submission.findUnique({ where: { id: sub.id } })
		expect(moved?.userId).toBe(newOwner.id)

		await page.getByRole("tab", { name: /History/i }).click()
		await expect(page.getByText("Submitter changed")).toBeVisible()
	})
})
