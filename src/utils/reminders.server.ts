import { prisma } from "@/db";
import type { EmailEventType } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/server/email";
import { getSetting } from "./settings.server";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Check if a reminder was already sent */
async function wasReminderSent(
	userId: string,
	reminderType: EmailEventType,
	entityId: string,
	reminderIndex: number,
): Promise<boolean> {
	const existing = await prisma.sentReminder.findUnique({
		where: {
			userId_reminderType_entityId_reminderIndex: {
				userId,
				reminderType,
				entityId,
				reminderIndex,
			},
		},
	});
	return !!existing;
}

/** Record a sent reminder */
async function recordReminder(
	userId: string,
	reminderType: EmailEventType,
	entityId: string,
	reminderIndex: number,
): Promise<void> {
	await prisma.sentReminder.create({
		data: { userId, reminderType, entityId, reminderIndex },
	});
}

/** Format a date for email display */
function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/** Send reviewer deadline reminders (REVIEWER_REMINDER) */
export async function sendReviewerReminders(): Promise<number> {
	const settings = await getSetting("REMINDER_REVIEWER_SETTINGS");
	if (!settings.enabled || settings.daysBefore.length === 0) return 0;

	const now = new Date();
	let sentCount = 0;

	for (let i = 0; i < settings.daysBefore.length; i++) {
		const days = settings.daysBefore[i];
		const threshold = new Date(now.getTime() + days * MS_PER_DAY);

		const assignments = await prisma.reviewAssignment.findMany({
			where: {
				status: { in: ["PENDING", "IN_PROGRESS"] },
				deadline: { lte: threshold, gt: now },
			},
			include: {
				reviewer: {
					select: { id: true, email: true, firstName: true, lastName: true },
				},
				submission: { select: { title: true } },
			},
		});

		for (const assignment of assignments) {
			if (!assignment.deadline) continue;

			const alreadySent = await wasReminderSent(
				assignment.reviewer.id,
				"REVIEWER_REMINDER",
				assignment.id,
				i,
			);
			if (alreadySent) continue;

			const reviewerName =
				`${assignment.reviewer.firstName ?? ""} ${assignment.reviewer.lastName ?? ""}`.trim() ||
				assignment.reviewer.email;
			const daysRemaining = Math.ceil(
				(assignment.deadline.getTime() - now.getTime()) / MS_PER_DAY,
			);

			void sendEmail("REVIEWER_REMINDER", assignment.reviewer.email, {
				reviewerName,
				submissionTitle: assignment.submission.title,
				deadline: formatDate(assignment.deadline),
				daysRemaining: String(daysRemaining),
			});

			await recordReminder(
				assignment.reviewer.id,
				"REVIEWER_REMINDER",
				assignment.id,
				i,
			);
			sentCount++;
		}
	}

	return sentCount;
}

/** Send revision nudge reminders (REVISION_REMINDER) */
export async function sendRevisionReminders(): Promise<number> {
	const settings = await getSetting("REMINDER_REVISION_SETTINGS");
	if (!settings.enabled) return 0;

	const now = new Date();

	const submissions = await prisma.submission.findMany({
		where: { status: "REVISE_REQUIRED" },
		include: {
			user: {
				select: { id: true, email: true, firstName: true, lastName: true },
			},
			statusHistory: {
				where: { toStatus: "REVISE_REQUIRED" },
				orderBy: { createdAt: "desc" },
				take: 1,
			},
		},
	});

	let sentCount = 0;

	for (const submission of submissions) {
		// Count already sent reminders for this submission
		const alreadySentCount = await prisma.sentReminder.count({
			where: {
				userId: submission.user.id,
				reminderType: "REVISION_REMINDER",
				entityId: submission.id,
			},
		});

		if (alreadySentCount >= settings.maxCount) continue;

		// Determine the reference date: last sent reminder or status change date
		const lastReminder = await prisma.sentReminder.findFirst({
			where: {
				userId: submission.user.id,
				reminderType: "REVISION_REMINDER",
				entityId: submission.id,
			},
			orderBy: { sentAt: "desc" },
		});

		const statusChangeDate = submission.statusHistory[0]?.createdAt;
		const referenceDate = lastReminder?.sentAt ?? statusChangeDate;
		if (!referenceDate) continue;

		const daysSinceReference = Math.floor(
			(now.getTime() - referenceDate.getTime()) / MS_PER_DAY,
		);
		if (daysSinceReference < settings.intervalDays) continue;

		const authorName =
			`${submission.user.firstName ?? ""} ${submission.user.lastName ?? ""}`.trim() ||
			submission.user.email;

		void sendEmail("REVISION_REMINDER", submission.user.email, {
			authorName,
			submissionTitle: submission.title,
		});

		await recordReminder(
			submission.user.id,
			"REVISION_REMINDER",
			submission.id,
			alreadySentCount,
		);
		sentCount++;
	}

	return sentCount;
}

/** Send submission deadline approaching reminders (DEADLINE_APPROACHING) */
export async function sendDeadlineReminders(): Promise<number> {
	const settings = await getSetting("REMINDER_DEADLINE_SETTINGS");
	if (!settings.enabled || settings.daysBefore.length === 0) return 0;

	const deadlineStr = await getSetting("SUBMISSION_DEADLINE");
	if (!deadlineStr) return 0;

	const deadline = new Date(deadlineStr);
	const now = new Date();
	if (deadline <= now) return 0;

	let sentCount = 0;

	for (let i = 0; i < settings.daysBefore.length; i++) {
		const days = settings.daysBefore[i];
		const daysUntilDeadline = (deadline.getTime() - now.getTime()) / MS_PER_DAY;

		// Only send if we're within the daysBefore window
		if (daysUntilDeadline > days) continue;

		const submissions = await prisma.submission.findMany({
			where: { status: { in: ["DRAFT", "REVISE_REQUIRED"] } },
			include: {
				user: {
					select: { id: true, email: true, firstName: true, lastName: true },
				},
			},
		});

		for (const submission of submissions) {
			const alreadySent = await wasReminderSent(
				submission.user.id,
				"DEADLINE_APPROACHING",
				submission.id,
				i,
			);
			if (alreadySent) continue;

			const recipientName =
				`${submission.user.firstName ?? ""} ${submission.user.lastName ?? ""}`.trim() ||
				submission.user.email;
			const daysRemaining = Math.ceil(daysUntilDeadline);

			void sendEmail("DEADLINE_APPROACHING", submission.user.email, {
				recipientName,
				submissionTitle: submission.title,
				deadline: formatDate(deadline),
				daysRemaining: String(daysRemaining),
			});

			await recordReminder(
				submission.user.id,
				"DEADLINE_APPROACHING",
				submission.id,
				i,
			);
			sentCount++;
		}
	}

	return sentCount;
}
