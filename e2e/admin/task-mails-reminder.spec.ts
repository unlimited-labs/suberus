import { test, expect } from "../helpers/base-fixtures"
import {
	createAssignmentWithDeadline,
	createSubmission,
	createSubmissionWithDecision,
	createSentReminder,
	cleanupSentReminders,
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
	// --- Reviewer reminders ---

	test("sends reviewer reminder when deadline approaching", async ({ page, testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer reminder test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		// Act
		const { result } = await runReminderTask(page)

		// Assert — search by testRunId in subject for cross-project isolation
		expect(result.reviewerReminders).toBeGreaterThanOrEqual(1)
		const email = await waitForEmail(REVIEWER_USER.email, testRun.testRunId, 15000)
		expect(email).toBeTruthy()

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})

	test("dedup — no duplicate on rerun", async ({ page, testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer dedup test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		// Act — first run
		await runReminderTask(page)
		// Wait for async email to arrive before clearing
		await waitForEmail(REVIEWER_USER.email, testRun.testRunId, 10000)
		await clearMailpitForAddress(REVIEWER_USER.email)

		// Act — second run
		const { result } = await runReminderTask(page)

		// Assert — no new reviewer reminders (dedup via SentReminder)
		expect(result.reviewerReminders).toBe(0)
		const email = await waitForEmail(REVIEWER_USER.email, testRun.testRunId, 3000)
		expect(email).toBeNull()

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})

	test("skips reviewer reminders when disabled", async ({ page, testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: false, daysBefore: [3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer disabled test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		// Act
		const { result } = await runReminderTask(page)

		// Assert
		expect(result.reviewerReminders).toBe(0)

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})

	test("sends for multiple thresholds", async ({ page, testRun, cleanup }) => {
		// Arrange — daysBefore: [7, 3], deadline in 2 days → both thresholds triggered
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [7, 3] })
		const { assignmentId, submissionId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Multi threshold test",
			assignmentStatus: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 2 * DAY_MS),
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(assignmentId)

		// Act
		const { result } = await runReminderTask(page)

		// Assert — should send 2 reminders (index 0 for 7-day, index 1 for 3-day)
		expect(result.reviewerReminders).toBeGreaterThanOrEqual(2)

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})

	// --- Revision reminders ---

	test("sends revision nudge after interval", async ({ page, testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: true, intervalDays: 0, maxCount: 3 })
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Revision nudge test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(submissionId)

		// Act
		const { result } = await runReminderTask(page)

		// Assert — search by testRunId for cross-project isolation
		expect(result.revisionReminders).toBeGreaterThanOrEqual(1)
		const email = await waitForEmail(TEST_USER.email, testRun.testRunId, 15000)
		expect(email).toBeTruthy()

		// Cleanup
		await cleanupSentReminders(submissionId)
	})

	test("respects revision maxCount", async ({ page, testRun, cleanup }) => {
		// Arrange — maxCount: 2, pre-fill 2 sent reminders
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: true, intervalDays: 0, maxCount: 2 })
		const { testUserId } = await getTestUserIds()
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Revision maxCount test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)
		await cleanupSentReminders(submissionId)

		// Pre-fill maxCount reminders
		await createSentReminder({ userId: testUserId, reminderType: "REVISION_REMINDER", entityId: submissionId, reminderIndex: 0 })
		await createSentReminder({ userId: testUserId, reminderType: "REVISION_REMINDER", entityId: submissionId, reminderIndex: 1 })

		// Act
		const { result } = await runReminderTask(page)

		// Assert — no new revision reminders (maxCount reached)
		expect(result.revisionReminders).toBe(0)
		const email = await waitForEmail(TEST_USER.email, testRun.testRunId, 3000)
		expect(email).toBeNull()

		// Cleanup
		await cleanupSentReminders(submissionId)
	})

	// --- Deadline reminders ---

	test("sends deadline reminder when approaching", async ({ page, testRun, cleanup }) => {
		// Arrange
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

		// Act
		const { result } = await runReminderTask(page)

		// Assert — search by testRunId for cross-project isolation
		expect(result.deadlineReminders).toBeGreaterThanOrEqual(1)
		const email = await waitForEmail(TEST_USER.email, testRun.testRunId, 15000)
		expect(email).toBeTruthy()

		// Cleanup
		await cleanupSentReminders(submission.id)
	})

	test("skips deadline reminder when deadline passed", async ({ page }) => {
		// Arrange
		const pastDeadline = new Date(Date.now() - DAY_MS).toISOString()
		await setAppSetting("SUBMISSION_DEADLINE", pastDeadline)
		await setAppSetting("REMINDER_DEADLINE_SETTINGS", { enabled: true, daysBefore: [3] })

		// Act
		const { result } = await runReminderTask(page)

		// Assert
		expect(result.deadlineReminders).toBe(0)
	})
})
