import { test, expect } from "../helpers/base-fixtures"
import { createSubmission, getPrisma } from "../helpers/test-db"
import { SubmissionStatus } from "../../src/generated/prisma/enums"
import {
	expectActionUnavailable,
	runSubmissionAction,
} from "../helpers/submission-actions"

test.describe("Admin submits a draft on the author's behalf", () => {
	test("sends a DRAFT into review from the detail page", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Draft To Submit",
			status: SubmissionStatus.DRAFT,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}`)
		await page
			.getByRole("heading", { name: sub.title })
			.waitFor({ timeout: 10000 })

		await runSubmissionAction(page, "Submit Draft")
		await page.getByRole("button", { name: "Submit Draft" }).click()

		await expect(page.getByText("Draft submitted")).toBeVisible()

		const db = getPrisma()
		const updated = await db.submission.findUnique({ where: { id: sub.id } })
		expect(updated?.status).toBe(SubmissionStatus.SUBMITTED)

		const activity = await db.activityLog.findFirst({
			where: { type: "SUBMISSION_DRAFT_SUBMITTED", submissionId: sub.id },
		})
		expect(activity).not.toBeNull()
	})

	test("edit form offers Save Draft and Submit on a DRAFT", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Draft Edit Then Submit",
			status: SubmissionStatus.DRAFT,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}/edit`)
		await expect(page.getByRole("button", { name: "Save Draft" })).toBeVisible()

		await page.getByRole("button", { name: "Submit" }).click()

		await expect(page.getByText("Submission submitted")).toBeVisible()

		const db = getPrisma()
		const updated = await db.submission.findUnique({ where: { id: sub.id } })
		expect(updated?.status).toBe(SubmissionStatus.SUBMITTED)
	})

	test("is not offered once the submission left DRAFT", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Already Submitted",
			status: SubmissionStatus.SUBMITTED,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}`)
		await page
			.getByRole("heading", { name: sub.title })
			.waitFor({ timeout: 10000 })

		await expectActionUnavailable(page, "Submit Draft")
	})
})

test.describe("Editor submits a draft", () => {
	test.use({ role: "editor" })

	test("editor can send a DRAFT into review", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Editor Draft Submit",
			status: SubmissionStatus.DRAFT,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}`)
		await page
			.getByRole("heading", { name: sub.title })
			.waitFor({ timeout: 10000 })

		await runSubmissionAction(page, "Submit Draft")
		await page.getByRole("button", { name: "Submit Draft" }).click()

		await expect(page.getByText("Draft submitted")).toBeVisible()

		const db = getPrisma()
		const updated = await db.submission.findUnique({ where: { id: sub.id } })
		expect(updated?.status).toBe(SubmissionStatus.SUBMITTED)
	})
})
