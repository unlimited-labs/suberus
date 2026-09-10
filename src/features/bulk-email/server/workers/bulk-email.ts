import type { Job, PgBoss } from "pg-boss";
import { env } from "@/env.ts";
import {
	deliverCampaignAnnouncement,
	findCampaignAnnouncement,
} from "@/features/announcements/server/campaign-delivery";
import { logger } from "@/logger.ts";
import { parseRecipientData, recipientValues } from "@/shared/lib/placeholders";
import { prisma } from "@/shared/server/db.server";
import { sendRawEmail } from "@/shared/server/email";
import {
	completeJob,
	failJob,
	setJobCurrent,
	setJobStage,
} from "@/shared/server/job-progress";
import { loadAttachmentBuffers } from "../attachments";
import { buildRecipientMail, type CampaignContent } from "../bulk-email-send";
import {
	finalCampaignStatus,
	RESUMABLE_CAMPAIGN_STATUSES,
} from "../bulk-email-status";

export interface BulkEmailJobData {
	campaignId: string;
	scheduledAt?: string | null;
}

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

type Campaign = NonNullable<
	Awaited<ReturnType<typeof prisma.emailCampaign.findUnique>>
>;

async function handleBulkEmail(jobs: Job<BulkEmailJobData>[]): Promise<void> {
	for (const job of jobs) {
		await processCampaign(job.data.campaignId, job.data.scheduledAt ?? null);
	}
}

type SendOutcome =
	| { status: "SENT"; subject: string; body: string }
	| { status: "FAILED"; error: string };

interface AnnouncementCopy {
	id: string;
	bodyTemplate: string;
}

async function recordResult(
	campaignId: string,
	recipientId: string,
	outcome: SendOutcome,
): Promise<void> {
	await prisma.$transaction([
		prisma.emailCampaignRecipient.update({
			where: { id: recipientId },
			data:
				outcome.status === "SENT"
					? {
							status: outcome.status,
							sentAt: new Date(),
							renderedSubject: outcome.subject,
							renderedBody: outcome.body,
						}
					: { status: outcome.status, error: outcome.error },
		}),
		prisma.emailCampaign.update({
			where: { id: campaignId },
			data:
				outcome.status === "SENT"
					? { sentCount: { increment: 1 } }
					: { failedCount: { increment: 1 } },
		}),
	]);
}

/**
 * Outside the send's try/catch on purpose: the mail is already out and counted,
 * so a failure here must not turn a delivered recipient into FAILED (which would
 * double-count and offer a "sent" preview on a failed row).
 */
async function deliverCopy(
	announcement: AnnouncementCopy | null,
	recipient: Parameters<typeof buildRecipientMail>[1] & {
		id: string;
		userId: string | null;
	},
	subject: string,
): Promise<void> {
	if (!announcement || !recipient.userId) return;
	try {
		await deliverCampaignAnnouncement({
			announcementId: announcement.id,
			userId: recipient.userId,
			subject,
			bodyTemplate: announcement.bodyTemplate,
			values: recipientValues(recipient),
		});
	} catch (error) {
		logger.error(
			`[bulk-email] profile copy for ${recipient.email}: ${error instanceof Error ? error.message : "unknown error"}`,
		);
	}
}

async function sendToRecipient(
	campaignId: string,
	content: CampaignContent,
	recipient: Parameters<typeof buildRecipientMail>[1] & {
		id: string;
		userId: string | null;
	},
	announcement: AnnouncementCopy | null,
): Promise<void> {
	try {
		const mail = buildRecipientMail(content, recipient);
		await sendRawEmail(mail);
		await recordResult(campaignId, recipient.id, {
			status: "SENT",
			subject: mail.subject,
			body: mail.html ?? mail.text ?? "",
		});
		await deliverCopy(announcement, recipient, mail.subject);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown send error";
		logger.error(
			`[bulk-email] ${campaignId} -> ${recipient.email}: ${message}`,
		);
		await recordResult(campaignId, recipient.id, {
			status: "FAILED",
			error: message,
		});
	}
}

async function reportProgress(
	jobProgressId: string | null,
	campaignId: string,
): Promise<void> {
	if (!jobProgressId) return;
	const counts = await prisma.emailCampaign.findUnique({
		where: { id: campaignId },
		select: { sentCount: true, failedCount: true },
	});
	if (counts) {
		await setJobCurrent(jobProgressId, counts.sentCount + counts.failedCount);
	}
}

async function claimCampaign(
	campaign: Campaign,
	scheduledAt: string | null,
): Promise<boolean> {
	const claimed = await prisma.emailCampaign.updateMany({
		where: {
			id: campaign.id,
			status: { in: RESUMABLE_CAMPAIGN_STATUSES },
			scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
		},
		data: { status: "SENDING" },
	});
	if (claimed.count === 0) {
		logger.info(
			`[bulk-email] campaign ${campaign.id} not claimable (status ${campaign.status}), skipping`,
		);
		return false;
	}
	return true;
}

async function beginSending(campaign: Campaign): Promise<void> {
	if (!campaign.jobProgressId) return;
	await setJobStage(
		campaign.jobProgressId,
		"sending",
		campaign.totalRecipients,
	);
	await setJobCurrent(
		campaign.jobProgressId,
		campaign.sentCount + campaign.failedCount,
	);
}

async function finishCampaign(
	campaignId: string,
	jobProgressId: string | null,
): Promise<void> {
	const final = (await prisma.emailCampaign.findUnique({
		where: { id: campaignId },
		select: { sentCount: true, failedCount: true },
	})) ?? { sentCount: 0, failedCount: 0 };
	await prisma.emailCampaign.update({
		where: { id: campaignId },
		data: {
			status: finalCampaignStatus(final.sentCount, final.failedCount),
			sentAt: new Date(),
		},
	});
	if (jobProgressId) await completeJob(jobProgressId, final);
	logger.info(
		`[bulk-email] campaign ${campaignId} done: ${final.sentCount} sent, ${final.failedCount} failed`,
	);
}

async function failMissingBody(campaign: Campaign): Promise<void> {
	const msg = "campaign has no rendered body";
	logger.error(`[bulk-email] ${campaign.id}: ${msg}`);
	await prisma.emailCampaign.update({
		where: { id: campaign.id },
		data: { status: "FAILED" },
	});
	if (campaign.jobProgressId) await failJob(campaign.jobProgressId, msg);
}

/**
 * Sends a campaign one recipient at a time, pausing `BULK_EMAIL_DELAY_SECONDS`
 * between each. Idempotent and resume-safe: only `PENDING` recipients are
 * processed and each is marked the instant it succeeds, so a restart (or
 * pg-boss retry after expiry) continues where it left off instead of
 * re-sending. At-least-once: a crash in the tiny window between SMTP accept and
 * the status write may resend that one recipient.
 */
async function processCampaign(
	campaignId: string,
	scheduledAt: string | null,
): Promise<void> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id: campaignId },
	});
	if (!campaign) {
		logger.warn(`[bulk-email] campaign ${campaignId} not found`);
		return;
	}
	if (!(await claimCampaign(campaign, scheduledAt))) return;
	if (campaign.renderedHtml === null) {
		await failMissingBody(campaign);
		return;
	}

	await beginSending(campaign);

	// ponytail: attachment bytes held in memory once for the whole run (capped at
	// MAX_CAMPAIGN_ATTACHMENTS_BYTES=25MB); stream from S3 per-recipient if that grows.
	const [pending, attachments, copy] = await Promise.all([
		prisma.emailCampaignRecipient.findMany({
			where: { campaignId, status: "PENDING" },
			orderBy: [{ email: "asc" }, { id: "asc" }],
		}),
		loadAttachmentBuffers(campaignId),
		campaign.saveToProfile ? findCampaignAnnouncement(campaignId) : null,
	]);
	const announcement: AnnouncementCopy | null =
		copy?.renderedHtml == null
			? null
			: { id: copy.id, bodyTemplate: copy.renderedHtml };
	const content: CampaignContent = {
		subject: campaign.subject,
		body: campaign.renderedHtml,
		isHtml: campaign.format !== "PLAIN",
		replyTo: campaign.replyTo || undefined,
		attachments: attachments.length ? attachments : undefined,
	};
	const delayMs = env.BULK_EMAIL_DELAY_SECONDS * 1000;

	for (const recipient of pending) {
		await sendToRecipient(
			campaignId,
			content,
			{ ...recipient, data: parseRecipientData(recipient.data) },
			announcement,
		);
		await reportProgress(campaign.jobProgressId, campaignId);
		await sleep(delayMs);
	}

	await finishCampaign(campaignId, campaign.jobProgressId);
}

export async function registerBulkEmailWorker(boss: PgBoss): Promise<void> {
	await boss.work<BulkEmailJobData>(
		"bulk-email",
		{ localConcurrency: 1 },
		handleBulkEmail,
	);
}
