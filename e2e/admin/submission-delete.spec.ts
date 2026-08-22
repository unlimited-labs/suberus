import { test, expect } from "../helpers/base-fixtures"
import {
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithReview,
	getPrisma,
} from "../helpers/test-db"
import { SubmissionStatus } from "../../src/generated/prisma/enums"
import { runSubmissionAction } from "../helpers/submission-actions"

test.describe("Admin Submission Delete", () => {
	test("can delete a simple submitted submission", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Delete Simple",
			status: SubmissionStatus.SUBMITTED,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}`)
		await page
			.getByRole("heading", { name: sub.title })
			.waitFor({ timeout: 10000 })

		await runSubmissionAction(page, "Delete")

		await expect(
			page.getByRole("heading", { name: "Delete Submission" }),
		).toBeVisible()
		await expect(
			page.getByLabel("Delete Submission").getByText(sub.title),
		).toBeVisible()

		await expect(page.getByText("Warnings:")).not.toBeVisible()

		await page.getByRole("button", { name: "Delete Submission" }).click()

		await expect(page).toHaveURL("/admin/submissions", { timeout: 10000 })
		await expect(page.getByText("Submission deleted")).toBeVisible()

		const db = getPrisma()
		const deleted = await db.submission.findUnique({
			where: { id: sub.id },
		})
		expect(deleted).toBeNull()
	})

	test("shows warnings for submission with active reviews", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { submissionId, title } = await createSubmissionWithAssignment({
			testRunId: testRun.testRunId,
			title: "Delete With Reviews",
		})
		cleanup.track(submissionId)

		await page.goto(`/admin/submissions/${submissionId}`)
		await page
			.getByRole("heading", { name: title })
			.waitFor({ timeout: 10000 })

		await runSubmissionAction(page, "Delete")

		await expect(page.getByText("Warnings:")).toBeVisible({ timeout: 5000 })
		await expect(
			page.getByText("Submission is in an active review process"),
		).toBeVisible()
		await expect(
			page.getByText(/reviewer assignment\(s\) will be deleted/),
		).toBeVisible()

		await expect(
			page.getByRole("button", { name: "Delete Submission" }),
		).toBeEnabled()

		await page.getByRole("button", { name: "Delete Submission" }).click()

		await expect(page).toHaveURL("/admin/submissions", { timeout: 10000 })
		await expect(page.getByText("Submission deleted")).toBeVisible()

		const db = getPrisma()
		const deleted = await db.submission.findUnique({
			where: { id: submissionId },
		})
		expect(deleted).toBeNull()
	})

	test("shows warnings for submission with completed reviews and decisions", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const { submissionId, title } = await createSubmissionWithReview({
			testRunId: testRun.testRunId,
			title: "Delete With Completed Review",
		})
		cleanup.track(submissionId)

		await page.goto(`/admin/submissions/${submissionId}`)
		await page
			.getByRole("heading", { name: title })
			.waitFor({ timeout: 10000 })

		await runSubmissionAction(page, "Delete")

		await expect(page.getByText("Warnings:")).toBeVisible({ timeout: 5000 })
		await expect(
			page.getByText(/review\(s\) will be permanently lost/),
		).toBeVisible()

		await expect(
			page.getByRole("button", { name: "Delete Submission" }),
		).toBeEnabled()
	})

	test("cancel button closes dialog without deleting", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Delete Cancel",
			status: SubmissionStatus.SUBMITTED,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}`)
		await page
			.getByRole("heading", { name: sub.title })
			.waitFor({ timeout: 10000 })

		await runSubmissionAction(page, "Delete")
		await expect(
			page.getByRole("heading", { name: "Delete Submission" }),
		).toBeVisible()

		await page.getByRole("button", { name: "Cancel" }).click()

		await expect(
			page.getByRole("heading", { name: "Delete Submission" }),
		).not.toBeVisible()

		await expect(page).toHaveURL(`/admin/submissions/${sub.id}`)

		const db = getPrisma()
		const existing = await db.submission.findUnique({
			where: { id: sub.id },
		})
		expect(existing).not.toBeNull()
	})

	test("logs SUBMISSION_DELETED activity after deletion", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Delete Activity Log",
			status: SubmissionStatus.DRAFT,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}`)
		await page
			.getByRole("heading", { name: sub.title })
			.waitFor({ timeout: 10000 })

		await runSubmissionAction(page, "Delete")
		await page.getByRole("button", { name: "Delete Submission" }).click()

		await expect(page).toHaveURL("/admin/submissions", { timeout: 10000 })

		const db = getPrisma()
		const activity = await db.activityLog.findFirst({
			where: {
				type: "SUBMISSION_DELETED",
			},
			orderBy: { createdAt: "desc" },
		})
		expect(activity).not.toBeNull()
		expect((activity!.detail as { title: string }).title).toBe(sub.title)
	})
})
