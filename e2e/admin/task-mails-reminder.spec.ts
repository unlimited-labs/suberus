import { test, expect } from "../helpers/base-fixtures"
import {
	createAssignmentWithDeadline,
	createSubmission,
	createSubmissionWithDecision,
	createSentReminder,
	cleanupSentReminders,
	countSentReminders,
	setAppSetting,
	getTestUserIds,
} from "../helpers/test-db"
import { clearMailpitForAddress, waitForEmail } from "../helpers/mailpit"
import { REVIEWER_USER, TEST_USER } from "../helpers/test-users"
import { AssignmentStatus, EditorDecisionType, SubmissionStatus } from "../../src/generated/prisma/enums"

const DAY_MS = 24 * 60 * 60 * 1000

async function runReminderTask(page: import("@playwright/test").Page) {
	const response = await page.request.post("/api/admin/tasks/mails:reminder")
	expect(response.status()).toBe(200)
	return (await response.json()) as {
		result: {
			reviewerReminders: number
			revisionReminders: number
			deadlineReminders: number
		}
	}
}

test.describe.serial("Task: mails:reminder", () => {
	test("sends reviewer reminder when deadline approaching", async ({ page, testRun, cleanup }) => {
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer reminder test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		const { result } = await runReminderTask(page)

		expect(result.reviewerReminders).toBeGreaterThanOrEqual(1)
		const email = await waitForEmail(REVIEWER_USER.email, testRun.testRunId, 15000)
		expect(email).toBeTruthy()

		await cleanupSentReminders(assignmentId)
	})

	test("dedup — no duplicate on rerun", async ({ page, testRun, cleanup }) => {
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer dedup test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		await runReminderTask(page)
		await waitForEmail(REVIEWER_USER.email, testRun.testRunId, 10000)
		await clearMailpitForAddress(REVIEWER_USER.email)

		const { result } = await runReminderTask(page)

		expect(result.reviewerReminders).toBe(0)
		const email = await waitForEmail(REVIEWER_USER.email, testRun.testRunId, 3000)
		expect(email).toBeNull()

		await cleanupSentReminders(assignmentId)
	})

	test("skips reviewer reminders when disabled", async ({ page, testRun, cleanup }) => {
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: false, daysBefore: [3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer disabled test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		const { result } = await runReminderTask(page)

		expect(result.reviewerReminders).toBe(0)

		await cleanupSentReminders(assignmentId)
	})

	test("sends for multiple thresholds", async ({ page, testRun, cleanup }) => {
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [7, 3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Multi threshold test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		const { result } = await runReminderTask(page)

		expect(result.reviewerReminders).toBeGreaterThanOrEqual(2)

		await cleanupSentReminders(assignmentId)
	})

	test("sends revision nudge after interval", async ({ page, testRun, cleanup }) => {
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: true, intervalDays: 0, maxCount: 3 })
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Revision nudge test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(submissionId)

		const { result } = await runReminderTask(page)

		expect(result.revisionReminders).toBeGreaterThanOrEqual(1)
		const email = await waitForEmail(TEST_USER.email, testRun.testRunId, 15000)
		expect(email).toBeTruthy()

		await cleanupSentReminders(submissionId)
	})

	test("respects revision maxCount", async ({ page, testRun, cleanup }) => {
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: true, intervalDays: 0, maxCount: 2 })
		const { testUserId } = await getTestUserIds()
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Revision maxCount test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(submissionId)

		await createSentReminder({ userId: testUserId, reminderType: "REVISION_REMINDER", entityId: submissionId, reminderIndex: 0 })
		await createSentReminder({ userId: testUserId, reminderType: "REVISION_REMINDER", entityId: submissionId, reminderIndex: 1 })

		await runReminderTask(page)

		// Assert — scoped to THIS submission: no new reminder created (maxCount reached).
		// The task's revisionReminders count is global and the shared worker DB may hold
		// other REVISE_REQUIRED submissions that legitimately receive reminders.
		expect(await countSentReminders(submissionId, "REVISION_REMINDER")).toBe(2)
		const email = await waitForEmail(TEST_USER.email, testRun.testRunId, 3000)
		expect(email).toBeNull()

		await cleanupSentReminders(submissionId)
	})

	test("sends deadline reminder when approaching", async ({ page, testRun, cleanup }) => {
		const futureDeadline = new Date(Date.now() + 2 * DAY_MS).toISOString()
		await setAppSetting("SUBMISSION_DEADLINE", futureDeadline)
		await setAppSetting("REMINDER_DEADLINE_SETTINGS", { enabled: true, daysBefore: [3] })
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Deadline reminder test",
			status: SubmissionStatus.DRAFT,
		})
		cleanup.track(submission.id)
		await cleanupSentReminders(submission.id)

		const { result } = await runReminderTask(page)

		expect(result.deadlineReminders).toBeGreaterThanOrEqual(1)
		const email = await waitForEmail(TEST_USER.email, testRun.testRunId, 15000)
		expect(email).toBeTruthy()

		await cleanupSentReminders(submission.id)
	})

	test("skips deadline reminder when deadline passed", async ({ page }) => {
		const pastDeadline = new Date(Date.now() - DAY_MS).toISOString()
		await setAppSetting("SUBMISSION_DEADLINE", pastDeadline)
		await setAppSetting("REMINDER_DEADLINE_SETTINGS", { enabled: true, daysBefore: [3] })

		const { result } = await runReminderTask(page)

		expect(result.deadlineReminders).toBe(0)
	})
})
