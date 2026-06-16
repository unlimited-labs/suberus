import type { Job, PgBoss } from "pg-boss";
import { env } from "@/env.ts";
import { logger } from "@/logger.ts";
import { prisma } from "@/shared/server/db.server";
import { sendRawEmail } from "@/shared/server/email";
import {
	completeJob,
	failJob,
	setJobCurrent,
	setJobStage,
} from "@/shared/server/job-progress";
import { buildRecipientMail } from "../bulk-email-send";
import {
	finalCampaignStatus,
	isResumableCampaignStatus,
} from "../bulk-email-status";

export interface BulkEmailJobData {
	campaignId: string;
}

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

type Campaign = NonNullable<
	Awaited<ReturnType<typeof prisma.emailCampaign.findUnique>>
>;

async function handleBulkEmail(jobs: Job<BulkEmailJobData>[]): Promise<void> {
	for (const job of jobs) {
		await processCampaign(job.data.campaignId);
	}
}

/** Records one recipient's outcome and bumps the matching campaign counter. */
async function recordResult(
	campaignId: string,
	recipientId: string,
	status: "SENT" | "FAILED",
	error?: string,
): Promise<void> {
	await prisma.$transaction([
		prisma.emailCampaignRecipient.update({
			where: { id: recipientId },
			data:
				status === "SENT" ? { status, sentAt: new Date() } : { status, error },
		}),
		prisma.emailCampaign.update({
			where: { id: campaignId },
			data:
				status === "SENT"
					? { sentCount: { increment: 1 } }
					: { failedCount: { increment: 1 } },
		}),
	]);
}

/** Sends to one recipient and records SENT/FAILED. Never throws. */
async function sendToRecipient(
	campaignId: string,
	content: { subject: string; body: string; isHtml: boolean },
	recipient: Parameters<typeof buildRecipientMail>[1] & { id: string },
): Promise<void> {
	try {
		await sendRawEmail(buildRecipientMail(content, recipient));
		await recordResult(campaignId, recipient.id, "SENT");
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown send error";
		logger.error(
			`[bulk-email] ${campaignId} -> ${recipient.email}: ${message}`,
		);
		await recordResult(campaignId, recipient.id, "FAILED", message);
	}
}

/** Mirrors current sent+failed count onto the JobProgress row (for SSE). */
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

async function beginSending(campaign: Campaign): Promise<void> {
	await prisma.emailCampaign.update({
		where: { id: campaign.id },
		data: { status: "SENDING" },
	});
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

/** True when the campaign is ready to send; logs + marks FAILED otherwise. */
async function canSend(campaign: Campaign): Promise<boolean> {
	if (!isResumableCampaignStatus(campaign.status)) {
		logger.info(
			`[bulk-email] campaign ${campaign.id} status ${campaign.status}, skipping`,
		);
		return false;
	}
	if (campaign.renderedHtml === null) {
		const msg = "campaign has no rendered body";
		logger.error(`[bulk-email] ${campaign.id}: ${msg}`);
		await prisma.emailCampaign.update({
			where: { id: campaign.id },
			data: { status: "FAILED" },
		});
		if (campaign.jobProgressId) await failJob(campaign.jobProgressId, msg);
		return false;
	}
	return true;
}

/**
 * Sends a campaign one recipient at a time, pausing `BULK_EMAIL_DELAY_SECONDS`
 * between each. Idempotent and resume-safe: only `PENDING` recipients are
 * processed and each is marked the instant it succeeds, so a restart (or
 * pg-boss retry after expiry) continues where it left off instead of
 * re-sending. At-least-once: a crash in the tiny window between SMTP accept and
 * the status write may resend that one recipient.
 */
async function processCampaign(campaignId: string): Promise<void> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id: campaignId },
	});
	if (!campaign) {
		logger.warn(`[bulk-email] campaign ${campaignId} not found`);
		return;
	}
	if (!(await canSend(campaign)) || campaign.renderedHtml === null) return;

	await beginSending(campaign);

	// Same order as the composer's Recipients panel (getCampaign) so the
	// SENT/FAILED marks light up top-to-bottom as the send progresses.
	const pending = await prisma.emailCampaignRecipient.findMany({
		where: { campaignId, status: "PENDING" },
		orderBy: [{ email: "asc" }, { id: "asc" }],
	});
	const content = {
		subject: campaign.subject,
		body: campaign.renderedHtml,
		isHtml: campaign.format !== "PLAIN",
	};
	const delayMs = env.BULK_EMAIL_DELAY_SECONDS * 1000;

	for (const recipient of pending) {
		await sendToRecipient(campaignId, content, recipient);
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
