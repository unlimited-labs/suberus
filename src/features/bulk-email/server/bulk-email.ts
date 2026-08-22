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
import {
	copyCampaignAttachments,
	deleteCampaignAttachments,
	listCampaignAttachments,
	loadAttachmentBuffers,
} from "./attachments";
import { renderEmailContent } from "./bulk-email-render";
import { campaignExpireSeconds } from "./bulk-email-status";
import { buildRecipientSnapshot } from "./recipient-snapshot";

export interface SaveDraftInput {
	subject: string;
	format: EmailCampaignFormat;
	bodySource: string;
	replyTo?: string | null;
}

export async function createDraftCampaign(
	userIds: string[],
	createdById: string,
): Promise<{ campaignId: string; totalRecipients: number }> {
	const uniqueIds = [...new Set(userIds)];
	const users = await prisma.user.findMany({
		where: { id: { in: uniqueIds } },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			submissions: {
				where: { type: { not: "INVITED" } },
				select: { title: true },
			},
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

	return { campaignId: campaign.id, totalRecipients: snapshots.length };
}

export async function duplicateCampaign(
	id: string,
	createdById: string,
): Promise<{ campaignId: string }> {
	const src = await prisma.emailCampaign.findUnique({
		where: { id },
		include: {
			recipients: {
				select: {
					userId: true,
					email: true,
					firstName: true,
					lastName: true,
					titles: true,
				},
			},
		},
	});
	if (!src) throw new Response("Campaign not found", { status: 404 });

	const campaign = await prisma.emailCampaign.create({
		data: {
			createdById,
			subject: src.subject,
			format: src.format,
			bodySource: src.bodySource,
			replyTo: src.replyTo,
			totalRecipients: src.recipients.length,
			recipients: { create: src.recipients },
		},
	});

	await copyCampaignAttachments(id, campaign.id, createdById);

	return { campaignId: campaign.id };
}

/** Cap on recipient rows hydrated into the composer (the true total lives in
 * `totalRecipients`); keeps the payload + DOM bounded for huge campaigns. */
export const RECIPIENT_PREVIEW_LIMIT = 200;

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
				orderBy: [{ email: "asc" }, { id: "asc" }],
				take: RECIPIENT_PREVIEW_LIMIT,
			},
		},
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });
	const attachments = await listCampaignAttachments(id);
	return { ...campaign, attachments };
}

export async function deleteCampaign(id: string): Promise<void> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });
	await deleteCampaignAttachments(id);
	await prisma.emailCampaign.delete({ where: { id } });
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
			replyTo: data.replyTo || null,
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
	if (!campaign.subject.trim() || !campaign.bodySource.trim()) {
		throw new Response("Subject and body are required", { status: 400 });
	}

	const rendered = await renderEmailContent(
		campaign.format,
		campaign.bodySource,
	);
	const sample = pickRandom(campaign.recipients);
	const values = sample ? recipientValues(sample) : SAMPLE_VALUES;

	const subject = `[TEST] ${applyPlaceholders(campaign.subject, values, false)}`;
	const body = applyPlaceholders(rendered.body, values, rendered.isHtml);
	const attachments = await loadAttachmentBuffers(id);

	await sendRawEmail({
		to: toEmail,
		subject,
		...(rendered.isHtml ? { html: body } : { text: body }),
		replyTo: campaign.replyTo || undefined,
		attachments: attachments.length ? attachments : undefined,
	});
}

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
	if (!campaign.subject.trim() || !campaign.bodySource.trim()) {
		throw new Response("Subject and body are required", { status: 400 });
	}

	const [rendered, jobProgressId] = await Promise.all([
		renderEmailContent(campaign.format, campaign.bodySource),
		createJobProgress("bulk-email", createdById),
	]);

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
