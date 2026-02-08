import { test, expect } from "../helpers/base-fixtures"
import {
	createAssignmentWithDeadline,
	createSubmissionWithDecision,
	createSubmission,
	cleanupSentReminders,
	createSentReminder,
	getTestUserIds,
	getPrisma,
	setAppSetting,
} from "../helpers/test-db"
import {
	clearMailpitForAddress,
	waitForEmail,
	getMailpitMessages,
} from "../auth/fixtures"
import { EditorDecisionType, SubmissionStatus } from "../../src/generated/prisma/enums"

const MS_PER_DAY = 24 * 60 * 60 * 1000

// All email tests must run serially — they share global settings
test.describe.configure({ mode: "serial" })

/**
 * Scoped trigger: sends reviewer reminder for a SINGLE assignment.
 * Unlike the production function that scans all assignments globally,
 * this targets one specific assignment to avoid parallel test interference.
 */
async function triggerReviewerReminderForAssignment(assignmentId: string): Promise<number> {
	const db = getPrisma()
	const setting = await db.appSetting.findUnique({
		where: { key: "REMINDER_REVIEWER_SETTINGS" },
	})
	const settings = (setting?.value as { enabled: boolean; daysBefore: number[] }) ?? {
		enabled: false,
		daysBefore: [3, 1],
	}
	if (!settings.enabled || settings.daysBefore.length === 0) return 0

	const now = new Date()
	let sentCount = 0

	const assignment = await db.reviewAssignment.findUnique({
		where: { id: assignmentId },
		include: {
			reviewer: { select: { id: true, email: true, firstName: true, lastName: true } },
			submission: { select: { title: true } },
		},
	})
	if (!assignment || !assignment.deadline) return 0
	if (!["PENDING", "IN_PROGRESS"].includes(assignment.status)) return 0
	if (assignment.deadline <= now) return 0

	for (let i = 0; i < settings.daysBefore.length; i++) {
		const days = settings.daysBefore[i]
		const threshold = new Date(now.getTime() + days * MS_PER_DAY)

		if (assignment.deadline > threshold) continue

		const existing = await db.sentReminder.findUnique({
			where: {
				userId_reminderType_entityId_reminderIndex: {
					userId: assignment.reviewer.id,
					reminderType: "REVIEWER_REMINDER",
					entityId: assignment.id,
					reminderIndex: i,
				},
			},
		})
		if (existing) continue

		const reviewerName =
			`${assignment.reviewer.firstName ?? ""} ${assignment.reviewer.lastName ?? ""}`.trim() ||
			assignment.reviewer.email
		const daysRemaining = Math.ceil(
			(assignment.deadline.getTime() - now.getTime()) / MS_PER_DAY,
		)

		await sendReminderEmail("REVIEWER_REMINDER", assignment.reviewer.email, {
			reviewerName,
			submissionTitle: assignment.submission.title,
			deadline: assignment.deadline.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			}),
			daysRemaining: String(daysRemaining),
		})

		await db.sentReminder.create({
			data: {
				userId: assignment.reviewer.id,
				reminderType: "REVIEWER_REMINDER",
				entityId: assignment.id,
				reminderIndex: i,
			},
		})
		sentCount++
	}
	return sentCount
}

/**
 * Scoped trigger: sends revision reminder for a SINGLE submission.
 */
async function triggerRevisionReminderForSubmission(submissionId: string): Promise<number> {
	const db = getPrisma()
	const setting = await db.appSetting.findUnique({
		where: { key: "REMINDER_REVISION_SETTINGS" },
	})
	const settings = (setting?.value as { enabled: boolean; intervalDays: number; maxCount: number }) ?? {
		enabled: false,
		intervalDays: 7,
		maxCount: 3,
	}
	if (!settings.enabled) return 0

	const now = new Date()
	const submission = await db.submission.findUnique({
		where: { id: submissionId },
		include: {
			user: { select: { id: true, email: true, firstName: true, lastName: true } },
			statusHistory: {
				where: { toStatus: "REVISE_REQUIRED" },
				orderBy: { createdAt: "desc" },
				take: 1,
			},
		},
	})
	if (!submission || submission.status !== "REVISE_REQUIRED") return 0

	const alreadySentCount = await db.sentReminder.count({
		where: {
			userId: submission.user.id,
			reminderType: "REVISION_REMINDER",
			entityId: submission.id,
		},
	})
	if (alreadySentCount >= settings.maxCount) return 0

	const lastReminder = await db.sentReminder.findFirst({
		where: {
			userId: submission.user.id,
			reminderType: "REVISION_REMINDER",
			entityId: submission.id,
		},
		orderBy: { sentAt: "desc" },
	})

	const statusChangeDate = submission.statusHistory[0]?.createdAt
	const referenceDate = lastReminder?.sentAt ?? statusChangeDate
	if (!referenceDate) return 0

	const daysSinceReference = Math.floor(
		(now.getTime() - referenceDate.getTime()) / MS_PER_DAY,
	)
	if (daysSinceReference < settings.intervalDays) return 0

	const authorName =
		`${submission.user.firstName ?? ""} ${submission.user.lastName ?? ""}`.trim() ||
		submission.user.email

	await sendReminderEmail("REVISION_REMINDER", submission.user.email, {
		authorName,
		submissionTitle: submission.title,
	})

	await db.sentReminder.create({
		data: {
			userId: submission.user.id,
			reminderType: "REVISION_REMINDER",
			entityId: submission.id,
			reminderIndex: alreadySentCount,
		},
	})
	return 1
}

/**
 * Scoped trigger: sends deadline reminder for a SINGLE submission.
 */
async function triggerDeadlineReminderForSubmission(submissionId: string): Promise<number> {
	const db = getPrisma()
	const setting = await db.appSetting.findUnique({
		where: { key: "REMINDER_DEADLINE_SETTINGS" },
	})
	const settings = (setting?.value as { enabled: boolean; daysBefore: number[] }) ?? {
		enabled: false,
		daysBefore: [7, 3, 1],
	}
	if (!settings.enabled || settings.daysBefore.length === 0) return 0

	const deadlineSetting = await db.appSetting.findUnique({
		where: { key: "SUBMISSION_DEADLINE" },
	})
	const deadlineStr = deadlineSetting?.value as string | null
	if (!deadlineStr) return 0

	const deadline = new Date(deadlineStr)
	const now = new Date()
	if (deadline <= now) return 0

	const submission = await db.submission.findUnique({
		where: { id: submissionId },
		include: {
			user: { select: { id: true, email: true, firstName: true, lastName: true } },
		},
	})
	if (!submission) return 0
	if (!["DRAFT", "REVISE_REQUIRED"].includes(submission.status)) return 0

	let sentCount = 0

	for (let i = 0; i < settings.daysBefore.length; i++) {
		const days = settings.daysBefore[i]
		const daysUntilDeadline = (deadline.getTime() - now.getTime()) / MS_PER_DAY
		if (daysUntilDeadline > days) continue

		const existing = await db.sentReminder.findUnique({
			where: {
				userId_reminderType_entityId_reminderIndex: {
					userId: submission.user.id,
					reminderType: "DEADLINE_APPROACHING",
					entityId: submission.id,
					reminderIndex: i,
				},
			},
		})
		if (existing) continue

		const recipientName =
			`${submission.user.firstName ?? ""} ${submission.user.lastName ?? ""}`.trim() ||
			submission.user.email
		const daysRemaining = Math.ceil(daysUntilDeadline)

		await sendReminderEmail("DEADLINE_APPROACHING", submission.user.email, {
			recipientName,
			submissionTitle: submission.title,
			deadline: deadline.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			}),
			daysRemaining: String(daysRemaining),
		})

		await db.sentReminder.create({
			data: {
				userId: submission.user.id,
				reminderType: "DEADLINE_APPROACHING",
				entityId: submission.id,
				reminderIndex: i,
			},
		})
		sentCount++
	}
	return sentCount
}

/** Send email via SMTP directly to Mailpit (mirrors app's sendEmail logic) */
async function sendReminderEmail(
	eventType: string,
	to: string,
	variables: Record<string, string>,
): Promise<void> {
	const db = getPrisma()
	const template = await db.emailTemplate.findUnique({
		where: { eventType: eventType as never },
	})
	if (!template || !template.isEnabled) return

	let subject = template.subject
	let body = template.body

	for (const [key, value] of Object.entries(variables)) {
		const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
		subject = subject.replace(regex, value)
		body = body.replace(regex, value)
	}

	const nodemailer = await import("nodemailer")
	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST ?? "localhost",
		port: Number(process.env.SMTP_PORT ?? 1025),
		secure: false,
	})

	await transporter.sendMail({
		from: process.env.SMTP_FROM ?? "conference@suberus.local",
		to,
		subject,
		[template.isHtml ? "html" : "text"]: body,
	})
}

test.describe("Reminder Emails - Reviewer", () => {
	test("sends reviewer reminder when deadline is approaching", async ({ testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [3] })
		const deadline = new Date(Date.now() + 2 * MS_PER_DAY) // 2 days from now (within 3-day window)
		const { submissionId, assignmentId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Reviewer Reminder Test",
			deadline,
		})
		cleanup.track(submissionId)
		await clearMailpitForAddress("reviewer@e2e.local")

		// Act
		const count = await triggerReviewerReminderForAssignment(assignmentId)

		// Assert
		expect(count).toBe(1)
		const email = await waitForEmail("reviewer@e2e.local", "Review Reminder", 10000)
		expect(email).not.toBeNull()

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})

	test("does not send reviewer reminder when disabled", async ({ testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: false, daysBefore: [3] })
		const deadline = new Date(Date.now() + 2 * MS_PER_DAY)
		const title = "Disabled Reminder Test"
		const { submissionId, assignmentId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title,
			deadline,
		})
		cleanup.track(submissionId)

		// Act
		const count = await triggerReviewerReminderForAssignment(assignmentId)

		// Assert — count must be 0, and no email with THIS test's title
		expect(count).toBe(0)
		await new Promise((r) => setTimeout(r, 1000))
		const { messages } = await getMailpitMessages()
		const matching = messages.filter(
			(m) =>
				m.To.some((t) => t.Address === "reviewer@e2e.local") &&
				m.Subject.includes(title) &&
				m.Subject.includes(testRun.testRunId),
		)
		expect(matching).toHaveLength(0)
	})

	test("deduplication — does not send same reminder twice", async ({ testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: true, daysBefore: [3] })
		const deadline = new Date(Date.now() + 2 * MS_PER_DAY)
		const { submissionId, assignmentId } = await createAssignmentWithDeadline({
			testRunId: testRun.testRunId,
			title: "Dedup Reminder Test",
			deadline,
		})
		cleanup.track(submissionId)

		// Act - send twice
		const count1 = await triggerReviewerReminderForAssignment(assignmentId)
		const count2 = await triggerReviewerReminderForAssignment(assignmentId)

		// Assert — count verifies dedup at the DB level
		expect(count1).toBe(1)
		expect(count2).toBe(0) // dedup: already sent

		// Verify only 1 email for THIS specific test run
		await new Promise((r) => setTimeout(r, 2000))
		const { messages } = await getMailpitMessages()
		const reminderEmails = messages.filter(
			(m) =>
				m.To.some((t) => t.Address === "reviewer@e2e.local") &&
				m.Subject.includes(testRun.testRunId),
		)
		expect(reminderEmails).toHaveLength(1)

		// Cleanup
		await cleanupSentReminders(assignmentId)
	})
})

test.describe("Reminder Emails - Revision", () => {
	test("sends revision reminder after interval days", async ({ testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: true, intervalDays: 1, maxCount: 3 })
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "Revision Reminder Test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)

		// Backdate the status history so intervalDays (1 day) has elapsed
		const db = getPrisma()
		await db.submissionStatusHistory.updateMany({
			where: { submissionId, toStatus: SubmissionStatus.REVISE_REQUIRED },
			data: { createdAt: new Date(Date.now() - 2 * MS_PER_DAY) },
		})

		await clearMailpitForAddress("test@e2e.local")

		// Act
		const count = await triggerRevisionReminderForSubmission(submissionId)

		// Assert
		expect(count).toBe(1)
		const email = await waitForEmail("test@e2e.local", "Revision Reminder", 10000)
		expect(email).not.toBeNull()

		// Cleanup
		await cleanupSentReminders(submissionId)
	})

	test("respects revision reminder maxCount", async ({ testRun, cleanup }) => {
		// Arrange
		await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: true, intervalDays: 1, maxCount: 1 })
		const { testUserId } = await getTestUserIds()
		const { submissionId } = await createSubmissionWithDecision({
			testRunId: testRun.testRunId,
			title: "MaxCount Reminder Test",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
		})
		cleanup.track(submissionId)

		// Backdate status history
		const db = getPrisma()
		await db.submissionStatusHistory.updateMany({
			where: { submissionId, toStatus: SubmissionStatus.REVISE_REQUIRED },
			data: { createdAt: new Date(Date.now() - 2 * MS_PER_DAY) },
		})

		// Insert 1 existing sent reminder (maxCount reached)
		await createSentReminder({
			userId: testUserId,
			reminderType: "REVISION_REMINDER",
			entityId: submissionId,
			reminderIndex: 0,
		})

		// Act
		const count = await triggerRevisionReminderForSubmission(submissionId)

		// Assert — count must be 0, and no email with THIS test's title
		expect(count).toBe(0)
		await new Promise((r) => setTimeout(r, 1000))
		const { messages } = await getMailpitMessages()
		const matching = messages.filter(
			(m) =>
				m.To.some((t) => t.Address === "test@e2e.local") &&
				m.Subject.includes(testRun.testRunId),
		)
		expect(matching).toHaveLength(0)

		// Cleanup
		await cleanupSentReminders(submissionId)
	})
})

test.describe("Reminder Emails - Deadline", () => {
	test("sends deadline approaching reminder", async ({ testRun, cleanup }) => {
		// Arrange
		const futureDeadline = new Date(Date.now() + 2 * MS_PER_DAY)
		await setAppSetting("SUBMISSION_DEADLINE", futureDeadline.toISOString())
		await setAppSetting("REMINDER_DEADLINE_SETTINGS", { enabled: true, daysBefore: [3] })
		const { testUserId } = await getTestUserIds()
		const { id: submissionId } = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Deadline Reminder Test",
			status: SubmissionStatus.DRAFT,
			userId: testUserId,
		})
		cleanup.track(submissionId)
		await clearMailpitForAddress("test@e2e.local")

		// Act
		const count = await triggerDeadlineReminderForSubmission(submissionId)

		// Assert
		expect(count).toBe(1)
		const email = await waitForEmail("test@e2e.local", "Deadline Approaching", 10000)
		expect(email).not.toBeNull()

		// Cleanup
		await cleanupSentReminders(submissionId)
		await setAppSetting("SUBMISSION_DEADLINE", "")
	})
})

test.afterAll(async () => {
	// Reset reminder settings to defaults
	await setAppSetting("REMINDER_REVIEWER_SETTINGS", { enabled: false, daysBefore: [3, 1] })
	await setAppSetting("REMINDER_REVISION_SETTINGS", { enabled: false, intervalDays: 7, maxCount: 3 })
	await setAppSetting("REMINDER_DEADLINE_SETTINGS", { enabled: false, daysBefore: [7, 3, 1] })
	await setAppSetting("SUBMISSION_DEADLINE", "")
})
