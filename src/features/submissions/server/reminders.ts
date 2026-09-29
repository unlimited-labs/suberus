import { setTimeout } from "node:timers/promises";
import { addDays, differenceInCalendarDays } from "date-fns";
import { env } from "@/env.ts";
import { getSetting } from "@/features/settings/server/settings";
import type { EmailEventType } from "@/generated/prisma/enums";
import { logger } from "@/logger.ts";
import { isDeadlinePassed } from "@/shared/lib/deadline";
import { dateForPattern, formatDate } from "@/shared/lib/format-date";
import { calendarDaysBetween, zonedDateString } from "@/shared/lib/zoned";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";

interface ReminderClaim {
	userId: string;
	reminderType: EmailEventType;
	entityId: string;
	reminderIndex: number;
}

// Claim before sending so overlapping runs can't double-send; release on failure to retry next run.
async function sendReminderOnce(
	claim: ReminderClaim,
	send: () => Promise<boolean>,
): Promise<boolean> {
	const { count } = await prisma.sentReminder.createMany({
		data: [claim],
		skipDuplicates: true,
	});
	if (count === 0) return false;
	if (!(await send())) {
		await prisma.sentReminder.delete({
			where: { userId_reminderType_entityId_reminderIndex: claim },
		});
		return false;
	}
	await setTimeout(env.BULK_EMAIL_DELAY_SECONDS * 1000);
	return true;
}

export async function sendReviewerReminders(): Promise<number> {
	const settings = await getSetting("REMINDER_REVIEWER_SETTINGS");
	if (!settings.enabled || settings.daysBefore.length === 0) {
		logger.debug("[reminders] reviewer reminders disabled, skipping");
		return 0;
	}

	const [dateFormat, zone] = await Promise.all([
		getSetting("DATE_FORMAT"),
		getSetting("CONFERENCE_TIMEZONE"),
	]);
	const now = new Date();
	let sentCount = 0;

	for (let i = 0; i < settings.daysBefore.length; i++) {
		const days = settings.daysBefore[i];
		const threshold = addDays(now, days);

		const assignments = await prisma.reviewAssignment.findMany({
			where: {
				status: "PENDING",
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
			const { deadline } = assignment;
			if (!deadline) continue;

			const reviewerName =
				`${assignment.reviewer.firstName ?? ""} ${assignment.reviewer.lastName ?? ""}`.trim() ||
				assignment.reviewer.email;
			const daysRemaining = calendarDaysBetween(now, deadline, zone);

			const sent = await sendReminderOnce(
				{
					userId: assignment.reviewer.id,
					reminderType: "REVIEWER_REMINDER",
					entityId: assignment.id,
					reminderIndex: i,
				},
				() =>
					sendEmail("REVIEWER_REMINDER", assignment.reviewer.email, {
						reviewerName,
						submissionTitle: assignment.submission.title,
						deadline: formatDate(
							dateForPattern(zonedDateString(deadline, zone)),
							dateFormat,
						),
						daysRemaining: String(daysRemaining),
						reviewUrl: `${env.APP_BASE_URL}/reviews/${assignment.id}`,
					}),
			);
			if (sent) sentCount++;
		}
	}

	logger.info(`[reminders] sent ${sentCount} reviewer reminders`);
	return sentCount;
}

export async function sendRevisionReminders(): Promise<number> {
	const settings = await getSetting("REMINDER_REVISION_SETTINGS");
	if (!settings.enabled) {
		logger.debug("[reminders] revision reminders disabled, skipping");
		return 0;
	}

	const now = new Date();

	const submissions = await prisma.submission.findMany({
		where: { status: "REVISE_REQUIRED" },
		include: {
			user: {
				select: { id: true, email: true, firstName: true, lastName: true },
			},
			activityLog: {
				where: {
					type: "SUBMISSION_STATUS_CHANGED",
					detail: { path: ["toStatus"], equals: "REVISE_REQUIRED" },
				},
				orderBy: { createdAt: "desc" },
				take: 1,
			},
		},
	});

	let sentCount = 0;

	for (const submission of submissions) {
		const userId = submission.user.id;
		const reminderKey = {
			userId,
			reminderType: "REVISION_REMINDER" as const,
			entityId: submission.id,
		};
		const alreadySentCount = await prisma.sentReminder.count({
			where: reminderKey,
		});

		if (alreadySentCount >= settings.maxCount) continue;

		const lastReminder = await prisma.sentReminder.findFirst({
			where: reminderKey,
			orderBy: { sentAt: "desc" },
		});

		const statusChangeDate = submission.activityLog[0]?.createdAt;
		const referenceDate = lastReminder?.sentAt ?? statusChangeDate;
		if (!referenceDate) continue;

		const daysSinceReference = differenceInCalendarDays(now, referenceDate);
		if (daysSinceReference < settings.intervalDays) continue;

		const authorName =
			`${submission.user.firstName ?? ""} ${submission.user.lastName ?? ""}`.trim() ||
			submission.user.email;

		const sent = await sendReminderOnce(
			{
				userId,
				reminderType: "REVISION_REMINDER",
				entityId: submission.id,
				reminderIndex: alreadySentCount,
			},
			() =>
				sendEmail("REVISION_REMINDER", submission.user.email, {
					authorName,
					submissionTitle: submission.title,
					submissionUrl: `${env.APP_BASE_URL}/submissions/${submission.id}`,
				}),
		);
		if (sent) sentCount++;
	}

	logger.info(`[reminders] sent ${sentCount} revision reminders`);
	return sentCount;
}

export async function sendDeadlineReminders(): Promise<number> {
	const settings = await getSetting("REMINDER_DEADLINE_SETTINGS");
	if (!settings.enabled || settings.daysBefore.length === 0) {
		logger.debug("[reminders] deadline reminders disabled, skipping");
		return 0;
	}

	const [deadlineStr, dateFormat, timezone] = await Promise.all([
		getSetting("SUBMISSION_DEADLINE"),
		getSetting("DATE_FORMAT"),
		getSetting("CONFERENCE_TIMEZONE"),
	]);
	if (!deadlineStr) return 0;

	const now = new Date();
	if (isDeadlinePassed(deadlineStr, timezone, now)) return 0;

	let sentCount = 0;

	for (let i = 0; i < settings.daysBefore.length; i++) {
		const days = settings.daysBefore[i];
		const daysUntilDeadline = calendarDaysBetween(now, deadlineStr, timezone);

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
			const recipientName =
				`${submission.user.firstName ?? ""} ${submission.user.lastName ?? ""}`.trim() ||
				submission.user.email;
			const daysRemaining = daysUntilDeadline;

			const sent = await sendReminderOnce(
				{
					userId: submission.user.id,
					reminderType: "DEADLINE_APPROACHING",
					entityId: submission.id,
					reminderIndex: i,
				},
				() =>
					sendEmail("DEADLINE_APPROACHING", submission.user.email, {
						recipientName,
						submissionTitle: submission.title,
						deadline: formatDate(dateForPattern(deadlineStr), dateFormat),
						daysRemaining: String(daysRemaining),
						submissionUrl: `${env.APP_BASE_URL}/submissions/${submission.id}`,
					}),
			);
			if (sent) sentCount++;
		}
	}

	logger.info(`[reminders] sent ${sentCount} deadline reminders`);
	return sentCount;
}
