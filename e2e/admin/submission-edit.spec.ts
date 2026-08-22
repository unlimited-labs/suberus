import type { Page } from "@playwright/test"
import { test, expect } from "../helpers/base-fixtures"
import {
	createSubmission,
	createSubmissionWithDecision,
	createSubmissionWithFile,
	getPrisma,
} from "../helpers/test-db"
import {
	EditorDecisionType,
	SubmissionStatus,
	SubmissionType,
} from "../../src/generated/prisma/enums"
import { SubmissionPage } from "../submissions/fixtures"
import {
	expectActionAvailable,
	expectActionUnavailable,
} from "../helpers/submission-actions"

const KW = ["machine-learning", "e2e-testing", "validation"]

const LONG_CONTENT =
	"Admin edited abstract content for the in-place edit suite. ".repeat(12) +
	"Padding text to comfortably exceed the configured minimum abstract length."

async function gotoEdit(page: Page, id: string) {
	await page.goto(`/admin/submissions/${id}/edit`)
	const title = page.getByLabel("Title")
	await expect(title).toBeVisible({ timeout: 15000 })
	// Prefill from the editor query has landed once the title is non-empty.
	await expect(title).not.toHaveValue("", { timeout: 15000 })
}

test.describe("Admin Submission Edit (in-place, admin-only)", () => {
	test("admin sees the Edit submission action", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Edit Action Visible",
			status: SubmissionStatus.SUBMITTED,
			keywords: KW,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}`)
		await page.getByRole("heading", { name: sub.title }).waitFor({ timeout: 10000 })

		await expectActionAvailable(page, "Edit submission")
	})

	test("edits title + abstract in place on UNDER_REVIEW without a new version", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow()
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Edit In Place",
			status: SubmissionStatus.UNDER_REVIEW,
			keywords: KW,
		})
		cleanup.track(sub.id)

		const sp = new SubmissionPage(page)
		await gotoEdit(page, sub.id)

		const newTitle = `${testRun.testRunId} Admin Edited Title`
		await sp.fillTitle(newTitle)
		await sp.fillContent(LONG_CONTENT)
		await sp.submit()

		await expect(page.getByText("Submission updated")).toBeVisible({
			timeout: 60000,
		})
		await expect(page).toHaveURL(`/admin/submissions/${sub.id}`, {
			timeout: 10000,
		})
		await expect(page.getByRole("heading", { name: newTitle })).toBeVisible()

		const db = getPrisma()
		const after = await db.submission.findUniqueOrThrow({
			where: { id: sub.id },
			include: { versions: true, currentVersion: true },
		})
		expect(after.versions).toHaveLength(1)
		expect(after.title).toBe(newTitle)
		expect(after.status).toBe(SubmissionStatus.UNDER_REVIEW)
		expect(after.currentVersion?.title).toBe(newTitle)
		expect(after.currentVersion?.content).toBe(LONG_CONTENT)

		const activity = await db.activityLog.findFirst({
			where: { type: "SUBMISSION_EDITED", submissionId: sub.id },
		})
		expect(activity).not.toBeNull()
	})

	test("re-freezes the current version snapshot with edited keywords", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow()
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Edit Keywords Snapshot",
			status: SubmissionStatus.SUBMITTED,
			keywords: KW,
		})
		cleanup.track(sub.id)

		const sp = new SubmissionPage(page)
		await gotoEdit(page, sub.id)

		await sp.addKeyword("admin-added-kw")
		await sp.submit()

		await expect(page.getByText("Submission updated")).toBeVisible({
			timeout: 60000,
		})

		const db = getPrisma()
		const sv = await db.submission.findUniqueOrThrow({
			where: { id: sub.id },
			select: {
				currentVersion: { select: { keywordsSnapshot: { select: { name: true } } } },
			},
		})
		const names = sv.currentVersion?.keywordsSnapshot.map((k) => k.name) ?? []
		expect(names).toContain("admin-added-kw")
		expect(names).toHaveLength(KW.length + 1)
	})

	test("can edit a REJECTED (terminal) submission, status preserved", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow()
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Edit Terminal Reject",
			editorDecision: EditorDecisionType.REJECT,
			keywords: KW,
		})
		cleanup.track(submissionId)

		const sp = new SubmissionPage(page)
		await gotoEdit(page, submissionId)

		const newTitle = `${testRun.testRunId} Edited After Reject`
		await sp.fillTitle(newTitle)
		await sp.submit()

		await expect(page.getByText("Submission updated")).toBeVisible({
			timeout: 60000,
		})

		const db = getPrisma()
		const after = await db.submission.findUniqueOrThrow({
			where: { id: submissionId },
		})
		expect(after.title).toBe(newTitle)
		expect(after.status).toBe(SubmissionStatus.REJECTED)
	})

	test("editing a FILE submission's metadata keeps the existing file", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow()
		const sub = await createSubmissionWithFile({
			testRunId: testRun.testRunId,
			title: "Edit File Metadata",
			status: SubmissionStatus.UNDER_REVIEW,
			keywords: KW,
		})
		cleanup.track(sub.id)

		const sp = new SubmissionPage(page)
		await gotoEdit(page, sub.id)

		const newTitle = `${testRun.testRunId} File Metadata Edited`
		await sp.fillTitle(newTitle)
		await sp.submit()

		await expect(page.getByText("Submission updated")).toBeVisible({
			timeout: 60000,
		})

		const db = getPrisma()
		const after = await db.submission.findUniqueOrThrow({
			where: { id: sub.id },
			include: { versions: true, currentVersion: true },
		})
		expect(after.versions).toHaveLength(1)
		expect(after.title).toBe(newTitle)
		expect(after.currentVersion?.fileId).toBe(sub.fileId)
	})

	test("EXHIBITOR entries cannot be edited via this form", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Exhibitor No Edit",
			type: SubmissionType.EXHIBITOR,
			status: SubmissionStatus.SUBMITTED,
			keywords: KW,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}/edit`)
		await expect(
			page.getByText("Exhibitor entries are managed via the exhibitor flow"),
		).toBeVisible({ timeout: 15000 })
	})
})

test.describe("Admin Submission Edit — editors are excluded", () => {
	test.use({ role: "editor" })

	test("editor does not see the Edit submission action", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Editor No Action",
			status: SubmissionStatus.SUBMITTED,
			keywords: KW,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}`)
		await page.getByRole("heading", { name: sub.title }).waitFor({ timeout: 10000 })

		await expectActionUnavailable(page, "Edit submission")
	})

	test("editor is blocked from the edit route", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Editor Blocked Route",
			status: SubmissionStatus.SUBMITTED,
			keywords: KW,
		})
		cleanup.track(sub.id)

		await page.goto(`/admin/submissions/${sub.id}/edit`)
		await expect(
			page.getByText("Only administrators can edit submissions"),
		).toBeVisible({ timeout: 15000 })
	})
})
