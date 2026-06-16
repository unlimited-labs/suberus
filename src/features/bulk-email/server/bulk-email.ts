import { env } from "@/env.ts";
import type { EmailCampaignFormat } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import { sendRawEmail } from "@/shared/server/email";
import { createJobProgress } from "@/shared/server/job-progress";
import { ensureQueueAndSend } from "@/shared/server/queue";
import {
	applyPlaceholders,
	pickRandom,
	recipientValues,
	SAMPLE_VALUES,
} from "../lib/placeholders";
import { renderEmailContent } from "./bulk-email-render";
import { campaignExpireSeconds } from "./bulk-email-status";
import { buildRecipientSnapshot } from "./recipient-snapshot";

export interface SaveDraftInput {
	subject: string;
	format: EmailCampaignFormat;
	bodySource: string;
}

/**
 * Creates a DRAFT campaign for the given users, snapshotting each recipient's
 * name and submission titles now (so later profile/submission edits don't
 * change a queued send). Returns the new campaign id.
 */
export async function createDraftCampaign(
	userIds: string[],
	createdById: string,
): Promise<{ campaignId: string }> {
	const uniqueIds = [...new Set(userIds)];
	const users = await prisma.user.findMany({
		where: { id: { in: uniqueIds } },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			submissions: { select: { title: true } },
		},
	});

	if (users.length === 0) {
		throw new Response("No valid recipients selected", { status: 400 });
	}

	const snapshots = users.map(buildRecipientSnapshot);
	const campaign = await prisma.emailCampaign.create({
		data: {
			createdById,
			totalRecipients: snapshots.length,
			recipients: {
				create: snapshots.map((s) => ({
					userId: s.userId,
					email: s.email,
					firstName: s.firstName,
					lastName: s.lastName,
					titles: s.titles,
				})),
			},
		},
	});

	return { campaignId: campaign.id };
}

export async function getCampaign(id: string) {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id },
		include: {
			recipients: {
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					titles: true,
					status: true,
					error: true,
				},
				orderBy: { email: "asc" },
			},
		},
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });
	return campaign;
}

export async function listCampaigns() {
	return prisma.emailCampaign.findMany({
		select: {
			id: true,
			subject: true,
			format: true,
			status: true,
			totalRecipients: true,
			sentCount: true,
			failedCount: true,
			createdAt: true,
			sentAt: true,
		},
		orderBy: { createdAt: "desc" },
		take: 100,
	});
}

/** Updates draft content. Only permitted while the campaign is still a DRAFT. */
export async function saveDraft(
	id: string,
	data: SaveDraftInput,
): Promise<void> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id },
		select: { status: true },
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });
	if (campaign.status !== "DRAFT") {
		throw new Response("Campaign already sent", { status: 409 });
	}
	await prisma.emailCampaign.update({
		where: { id },
		data: {
			subject: data.subject,
			format: data.format,
			bodySource: data.bodySource,
		},
	});
}

export interface RenderedPreview {
	body: string;
	isHtml: boolean;
}

export function previewContent(
	format: EmailCampaignFormat,
	bodySource: string,
): Promise<RenderedPreview> {
	return renderEmailContent(format, bodySource);
}

/**
 * Sends a one-off preview of the campaign to `toEmail` with placeholders filled
 * from a random recipient (or sample data when the campaign has none).
 */
export async function sendCampaignTest(
	id: string,
	toEmail: string,
): Promise<void> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id },
		include: {
			recipients: {
				select: { firstName: true, lastName: true, titles: true },
			},
		},
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });

	const rendered = await renderEmailContent(
		campaign.format,
		campaign.bodySource,
	);
	const sample = pickRandom(campaign.recipients);
	const values = sample ? recipientValues(sample) : SAMPLE_VALUES;

	const subject = `[TEST] ${applyPlaceholders(campaign.subject, values, false)}`;
	const body = applyPlaceholders(rendered.body, values, rendered.isHtml);

	await sendRawEmail({
		to: toEmail,
		subject,
		...(rendered.isHtml ? { html: body } : { text: body }),
	});
}

/**
 * Renders + snapshots the body, marks the campaign QUEUED, and enqueues the
 * worker. Job expiry is sized so a long throttled run can't expire mid-send.
 */
export async function finalizeAndEnqueue(
	id: string,
	createdById: string,
): Promise<{ jobProgressId: string }> {
	const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
	if (!campaign) throw new Response("Campaign not found", { status: 404 });
	if (campaign.status !== "DRAFT") {
		throw new Response("Campaign already sent", { status: 409 });
	}
	if (campaign.totalRecipients === 0) {
		throw new Response("Campaign has no recipients", { status: 400 });
	}

	const rendered = await renderEmailContent(
		campaign.format,
		campaign.bodySource,
	);
	const jobProgressId = await createJobProgress("bulk-email", createdById);

	await prisma.emailCampaign.update({
		where: { id },
		data: {
			status: "QUEUED",
			renderedHtml: rendered.body,
			jobProgressId,
		},
	});

	await ensureQueueAndSend(
		"bulk-email",
		{ campaignId: id },
		{
			retryLimit: 3,
			retryDelay: 10,
			expireInSeconds: campaignExpireSeconds(
				campaign.totalRecipients,
				env.BULK_EMAIL_DELAY_SECONDS,
			),
		},
	);

	return { jobProgressId };
}
