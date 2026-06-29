import { test, expect } from "../helpers/base-fixtures"
import {
	createSubmissionWithDecision,
	getPrisma,
} from "../helpers/test-db"
import {
	EditorDecisionType,
	SubmissionStatus,
} from "../../src/generated/prisma/enums"
import { TEST_USER, ADMIN_USER, REVIEWER_USER } from "../helpers/test-users"
import { loginAs } from "../helpers/auth"
import { runSubmissionAction } from "../helpers/submission-actions"

async function findSubmissionInAdmin(page: import("@playwright/test").Page, title: string) {
	await page.goto("/admin/submissions")
	const searchInput = page.getByPlaceholder(/Search/i)
	await expect(searchInput).toBeVisible({ timeout: 10000 })
	await searchInput.fill(title)

	const row = page.getByTestId("submission-row").filter({ visible: true, hasText: title }).first()
	await expect(row).toBeVisible({ timeout: 10000 })

	await row.getByRole("button").last().click()
	await page.getByRole("menuitem", { name: /View/i }).click()
	await page.waitForURL(/\/admin\/submissions\/[a-f0-9-]+/)
}

test.describe("Resubmission Auto-Reassign Reviewers", () => {
	test("reviewers are auto-reassigned after resubmission", async ({
		page,
		testRun,
		cleanup,
	}) => {
		test.slow()

		// Arrange - create submission with REVISE_AND_RESUBMIT decision
		const { submissionId, title } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Resubmit Reassign Test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)

		const db = getPrisma()

		// Verify initial state
		const submission = await db.submission.findUnique({
			where: { id: submissionId },
			select: { status: true, currentRound: true },
		})
		expect(submission?.status).toBe(SubmissionStatus.REVISE_REQUIRED)
		expect(submission?.currentRound).toBe(1)

		// Verify round 1 assignment exists
		const round1Assignments = await db.reviewAssignment.findMany({
			where: { submissionId, round: 1 },
			select: { reviewerId: true, status: true },
		})
		expect(round1Assignments.length).toBeGreaterThan(0)

		// Act - author resubmits
		await loginAs(page, TEST_USER, { clearCookies: true })
		await page.goto(`/submissions/${submissionId}/revise`)
		await page.getByLabel("Title").waitFor({ state: "visible", timeout: 15000 })

		const revisedTitle = `${title} (revised)`
		await page.getByLabel("Title").clear()
		await page.getByLabel("Title").fill(revisedTitle)
		await page.getByLabel("Abstract").fill(
			"This is the revised abstract with updated content addressing reviewer feedback. " +
				"The methodology has been improved and additional experiments were conducted. " +
				"Results are now more comprehensive and clearly presented. " +
				"We have addressed all reviewer concerns in this revised version. " +
				"Additional details and clarifications have been added throughout the manuscript.",
		)

		// Change a tag: revisions may now edit keywords (persisted + snapshotted)
		const revisedKeyword = "revisedtag"
		const keywordInput = page.getByTestId("keywords-section").locator("input")
		await keywordInput.fill(revisedKeyword)
		await keywordInput.press("Enter")

		await page.getByRole("button", { name: /Submit Revision/i }).click()

		// Wait for redirect to submission detail
		await page.waitForURL(/\/submissions\/[a-f0-9-]+$/, { timeout: 30000 })

		// Assert - verify in DB that round was incremented and reviewers reassigned
		const updatedSubmission = await db.submission.findUnique({
			where: { id: submissionId },
			select: { status: true, currentRound: true },
		})
		expect(updatedSubmission?.currentRound).toBe(2)

		// Verify the new version froze an author + keyword snapshot, and the
		// canonical keyword set picked up the changed tag.
		const newVersion = await db.submissionVersion.findFirst({
			where: { submissionId },
			orderBy: { version: "desc" },
			select: {
				id: true,
				authorsSnapshot: { select: { firstName: true } },
				keywordsSnapshot: { select: { name: true } },
			},
		})
		expect(newVersion?.authorsSnapshot.length ?? 0).toBeGreaterThan(0)
		expect(newVersion?.keywordsSnapshot.map((k) => k.name)).toContain(
			revisedKeyword,
		)

		const canonicalKeywords = await db.submissionKeyword.findMany({
			where: { submissionId },
			select: { keyword: { select: { name: true } } },
		})
		expect(canonicalKeywords.map((k) => k.keyword.name)).toContain(
			revisedKeyword,
		)

		// Verify round 2 assignments were auto-created
		const round2Assignments = await db.reviewAssignment.findMany({
			where: { submissionId, round: 2 },
			select: { reviewerId: true, status: true },
		})
		expect(round2Assignments.length).toBe(round1Assignments.length)

		// Verify same reviewer was reassigned
		const round1ReviewerIds = round1Assignments.map((a) => a.reviewerId).sort()
		const round2ReviewerIds = round2Assignments.map((a) => a.reviewerId).sort()
		expect(round2ReviewerIds).toEqual(round1ReviewerIds)

		// Assert via admin UI - verify reviewer appears in current reviewers
		await loginAs(page, ADMIN_USER, { clearCookies: true })
		await findSubmissionInAdmin(page, revisedTitle)

		await runSubmissionAction(page, "Assign Reviewer")
		const dialog = page.getByRole("dialog")
		await dialog.waitFor({ state: "visible" })

		await expect(page.getByText(/Current Reviewers \(/i)).toBeVisible()
		await expect(page.getByText(REVIEWER_USER.email).first()).toBeVisible()

		await dialog.getByRole("button", { name: "Close" }).first().click()
		await dialog.waitFor({ state: "hidden", timeout: 5000 })
	})

	test("cancelled assignments are not reassigned on resubmission", async ({
		page,
		testRun,
		cleanup,
	}) => {
		// Arrange - create submission with REVISE_AND_RESUBMIT decision
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Resubmit No Reassign Cancelled",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)

		const db = getPrisma()

		// Cancel the round 1 assignment
		await db.reviewAssignment.updateMany({
			where: { submissionId, round: 1 },
			data: { status: "CANCELLED" },
		})

		// Act - author resubmits
		await loginAs(page, TEST_USER, { clearCookies: true })
		await page.goto(`/submissions/${submissionId}/revise`)
		await page.getByLabel("Title").waitFor({ state: "visible", timeout: 15000 })

		await page.getByLabel("Abstract").fill(
			"Revised content for cancelled assignment test. " +
				"This revision includes significant changes to the methodology section. " +
				"The results have been updated to reflect the new experimental data. " +
				"We appreciate the reviewers' feedback and have made appropriate changes. " +
				"All previously identified issues have been addressed in this version.",
		)
		await page.getByRole("button", { name: /Submit Revision/i }).click()
		await page.waitForURL(/\/submissions\/[a-f0-9-]+$/, { timeout: 30000 })

		// Assert - verify no round 2 assignments exist
		const round2Assignments = await db.reviewAssignment.findMany({
			where: { submissionId, round: 2 },
		})
		expect(round2Assignments.length).toBe(0)
	})
})
