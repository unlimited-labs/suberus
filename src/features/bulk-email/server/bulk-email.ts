import { env } from "@/env.ts";
import { createCampaignAnnouncement } from "@/features/announcements/server/from-campaign";
import { campaignAnnouncementBody } from "@/features/announcements/server/sanitize";
import type {
	EmailCampaignFormat,
	EmailCampaignRecipientStatus,
	EmailCampaignStatus,
} from "@/generated/prisma/enums";
import {
	assertKnownPlaceholders,
	placeholderIssues as sharedPlaceholderIssues,
} from "@/shared/lib/placeholder-issues";
import {
	applyPlaceholders,
	parseDataColumns,
	parseRecipientData,
	pickRandom,
	recipientValues,
	type RecipientSnapshot,
	SAMPLE_VALUES,
	type PlaceholderIssues,
} from "@/shared/lib/placeholders";
import { buildRecipientSnapshot } from "@/shared/lib/recipient-snapshot";
import { FUTURE_INSTANT_MESSAGE, isFutureInstant } from "@/shared/lib/schedule";
import { prisma } from "@/shared/server/db.server";
import { sendRawEmail } from "@/shared/server/email";
import { createJobProgress, failJob } from "@/shared/server/job-progress";
import { ensureQueueAndSend } from "@/shared/server/queue";
import {
	loadRecipientSnapshots,
	loadSnapshotUsers,
} from "@/shared/server/recipient-snapshot";
import { matchSheetRows } from "@/shared/server/sheet-match";
import type { SheetCampaignCreateInput } from "../validations";
import {
	copyCampaignAttachments,
	deleteCampaignAttachments,
	listCampaignAttachments,
	loadAttachmentBuffers,
} from "./attachments";
import { renderEmailContent } from "./bulk-email-render";
import { campaignExpireSeconds } from "./bulk-email-status";

export interface SaveDraftInput {
	subject: string;
	format: EmailCampaignFormat;
	bodySource: string;
	replyTo?: string | null;
	saveToProfile?: boolean;
}

export async function createDraftCampaign(
	userIds: string[],
	createdById: string,
): Promise<{ campaignId: string; totalRecipients: number }> {
	const snapshots = await loadRecipientSnapshots(userIds);
	if (snapshots.length === 0) {
		throw new Response("No valid recipients selected", { status: 400 });
	}

	const campaignId = await insertCampaign(snapshots, createdById, {});

	return { campaignId, totalRecipients: snapshots.length };
}

export async function insertCampaign(
	snapshots: RecipientSnapshot[],
	createdById: string,
	dataColumns: Record<string, string>,
	base?: Pick<
		SaveDraftInput,
		"subject" | "format" | "bodySource" | "saveToProfile"
	> & {
		replyTo: string | null;
	},
): Promise<string> {
	const campaign = await prisma.emailCampaign.create({
		data: {
			...base,
			createdById,
			dataColumns,
			totalRecipients: snapshots.length,
			recipients: {
				create: snapshots.map((s) => ({
					userId: s.userId,
					email: s.email,
					firstName: s.firstName,
					lastName: s.lastName,
					titles: s.titles,
					data: s.data,
				})),
			},
		},
	});
	return campaign.id;
}

interface SheetMapping {
	dataKeys: Array<{ column: number; key: string }>;
	builtinColumns: Partial<Record<"firstName" | "lastName", number>>;
}

function splitMapping(
	mapping: SheetCampaignCreateInput["mapping"],
): SheetMapping {
	const result: SheetMapping = { dataKeys: [], builtinColumns: {} };
	for (const { column, target } of mapping) {
		switch (target.kind) {
			case "data":
				result.dataKeys.push({ column, key: target.key });
				break;
			case "builtin":
				result.builtinColumns[target.field] = column;
				break;
			default: {
				const _exhaustive: never = target;
				throw new Error(`Unsupported mapping target: ${_exhaustive}`);
			}
		}
	}
	return result;
}

export async function createCampaignFromSheet(
	input: SheetCampaignCreateInput,
	createdById: string,
): Promise<{ campaignId: string; totalRecipients: number }> {
	const match = await matchSheetRows(input);
	if (match.problems.length > 0) {
		throw new Response("Fix the spreadsheet problems before importing", {
			status: 400,
		});
	}

	const { dataKeys, builtinColumns } = splitMapping(input.mapping);
	const users = await loadSnapshotUsers(
		match.rows.flatMap((r) => (r.kind === "user" ? [r.userId] : [])),
	);
	const byId = new Map(users.map((u) => [u.id, u]));

	const snapshots = match.rows.flatMap((matched): RecipientSnapshot[] => {
		const row = input.sheet.rows[matched.row] ?? [];
		const data = Object.fromEntries(
			dataKeys.map(({ column, key }) => [key, row[column] ?? ""]),
		);
		if (matched.kind === "user") {
			const user = byId.get(matched.userId);
			return user ? [{ ...buildRecipientSnapshot(user), data }] : [];
		}
		if (input.unmatched === "skip") return [];
		const fromSheet = (field: "firstName" | "lastName") => {
			const column = builtinColumns[field];
			return column === undefined ? null : row[column] || null;
		};
		return [
			{
				userId: null,
				email: matched.email,
				firstName: fromSheet("firstName"),
				lastName: fromSheet("lastName"),
				titles: "",
				data,
			},
		];
	});

	if (snapshots.length === 0) {
		throw new Response("No recipients left to import", { status: 400 });
	}

	const campaignId = await insertCampaign(
		snapshots,
		createdById,
		Object.fromEntries(
			dataKeys.map(({ column, key }) => [
				key,
				input.sheet.columns[column] ?? key,
			]),
		),
	);
	return { campaignId, totalRecipients: snapshots.length };
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
					data: true,
				},
			},
		},
	});
	if (!src) throw new Response("Campaign not found", { status: 404 });

	const campaignId = await insertCampaign(
		src.recipients.map((r) => ({ ...r, data: parseRecipientData(r.data) })),
		createdById,
		parseDataColumns(src.dataColumns),
		{
			subject: src.subject,
			format: src.format,
			bodySource: src.bodySource,
			replyTo: src.replyTo,
			saveToProfile: src.saveToProfile,
		},
	);

	await copyCampaignAttachments(id, campaignId, createdById);

	return { campaignId };
}

/** Cap on recipient rows hydrated into the composer (the true total lives in
 * `totalRecipients`); keeps the payload + DOM bounded for huge campaigns. */
export const RECIPIENT_PREVIEW_LIMIT = 200;

/**
 * The three states a row can actually be in. Replaces the loose
 * `{ status, error, hasRendered }` trio, which let a PENDING recipient carry an
 * archive and a SENT one carry an error.
 */
export type RecipientDelivery =
	| { kind: "PENDING" }
	| { kind: "SENT"; hasArchive: boolean }
	| { kind: "FAILED"; error: string };

function toDelivery(row: {
	status: EmailCampaignRecipientStatus;
	error: string | null;
	renderedSubject: string | null;
}): RecipientDelivery {
	switch (row.status) {
		case "PENDING":
			return { kind: "PENDING" };
		case "SENT":
			return { kind: "SENT", hasArchive: row.renderedSubject !== null };
		case "FAILED":
			return { kind: "FAILED", error: row.error ?? "Send failed" };
		default: {
			const _exhaustive: never = row.status;
			throw new Error(`Unsupported recipient status: ${_exhaustive}`);
		}
	}
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
					renderedSubject: true,
				},
				orderBy: [{ email: "asc" }, { id: "asc" }],
				take: RECIPIENT_PREVIEW_LIMIT,
			},
		},
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });
	const [attachments, recipientsWithoutAccount] = await Promise.all([
		listCampaignAttachments(id),
		prisma.emailCampaignRecipient.count({
			where: { campaignId: id, userId: null },
		}),
	]);
	return {
		...campaign,
		recipientsWithoutAccount,
		recipients: campaign.recipients.map(
			({ status, error, renderedSubject, ...recipient }) => ({
				...recipient,
				delivery: toDelivery({ status, error, renderedSubject }),
			}),
		),
		dataColumns: parseDataColumns(campaign.dataColumns),
		attachments,
	};
}

/** The archived copy of one delivered mail; null while the recipient is still
 * pending, failed, or predates the archive. */
export async function getSentMessage(recipientId: string) {
	const recipient = await prisma.emailCampaignRecipient.findUnique({
		where: { id: recipientId },
		select: {
			email: true,
			sentAt: true,
			renderedSubject: true,
			renderedBody: true,
			campaign: { select: { format: true } },
		},
	});
	if (!recipient) throw new Response("Recipient not found", { status: 404 });
	if (recipient.renderedSubject === null || recipient.renderedBody === null) {
		return null;
	}
	return {
		email: recipient.email,
		sentAt: recipient.sentAt,
		subject: recipient.renderedSubject,
		body: recipient.renderedBody,
		isHtml: recipient.campaign.format !== "PLAIN",
	};
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
			scheduledAt: true,
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
			saveToProfile: data.saveToProfile ?? false,
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

export async function placeholderIssues(
	id: string,
	tokens: string[],
): Promise<PlaceholderIssues> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id },
		select: { dataColumns: true },
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });

	return sharedPlaceholderIssues(campaign.dataColumns, tokens, () =>
		prisma.emailCampaignRecipient.findMany({
			where: { campaignId: id },
			select: {
				email: true,
				firstName: true,
				lastName: true,
				titles: true,
				data: true,
			},
			orderBy: [{ email: "asc" }],
		}),
	);
}

export async function sendCampaignTest(
	id: string,
	toEmail: string,
): Promise<void> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id },
		include: {
			recipients: {
				select: {
					firstName: true,
					lastName: true,
					titles: true,
					data: true,
				},
			},
		},
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });
	if (!campaign.subject.trim() || !campaign.bodySource.trim()) {
		throw new Response("Subject and body are required", { status: 400 });
	}
	await assertKnownPlaceholders(
		(tokens) => placeholderIssues(id, tokens),
		campaign.subject,
		campaign.bodySource,
	);

	const rendered = await renderEmailContent(
		campaign.format,
		campaign.bodySource,
	);
	const sample = pickRandom(campaign.recipients);
	const values = sample
		? recipientValues({ ...sample, data: parseRecipientData(sample.data) })
		: {
				...SAMPLE_VALUES,
				...Object.fromEntries(
					Object.keys(parseDataColumns(campaign.dataColumns)).map((key) => [
						key,
						"sample",
					]),
				),
			};

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
	scheduledAt?: string,
): Promise<{ jobProgressId: string }> {
	if (scheduledAt !== undefined && !isFutureInstant(scheduledAt)) {
		throw new Response(FUTURE_INSTANT_MESSAGE, { status: 400 });
	}
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
	await assertKnownPlaceholders(
		(tokens) => placeholderIssues(id, tokens),
		campaign.subject,
		campaign.bodySource,
	);

	const [rendered, jobProgressId] = await Promise.all([
		renderEmailContent(campaign.format, campaign.bodySource),
		createJobProgress("bulk-email", createdById),
	]);

	// Before the status flip: a throw here would otherwise strand the campaign in
	// QUEUED with no job, which the DRAFT guard makes unrecoverable.
	if (campaign.saveToProfile) {
		const withAccount = await prisma.emailCampaignRecipient.findMany({
			where: { campaignId: id, userId: { not: null } },
			select: { userId: true },
			distinct: ["userId"],
		});
		await createCampaignAnnouncement({
			campaignId: id,
			createdById,
			subject: campaign.subject,
			bodySource: campaign.bodySource,
			renderedBodyTemplate: campaignAnnouncementBody(
				campaign.format,
				campaign.bodySource,
				rendered.body,
			),
			dataColumns: parseDataColumns(campaign.dataColumns),
			userIds: withAccount.flatMap((r) => (r.userId ? [r.userId] : [])),
		});
	}

	const startAfter = scheduledAt ? new Date(scheduledAt) : undefined;

	await prisma.emailCampaign.update({
		where: { id },
		data: {
			status: startAfter ? "SCHEDULED" : "QUEUED",
			scheduledAt: startAfter ?? null,
			renderedHtml: rendered.body,
			jobProgressId,
		},
	});

	try {
		await ensureQueueAndSend(
			"bulk-email",
			{ campaignId: id, scheduledAt: scheduledAt ?? null },
			{
				retryLimit: 3,
				retryDelay: 10,
				expireInSeconds: campaignExpireSeconds(
					campaign.totalRecipients,
					env.BULK_EMAIL_DELAY_SECONDS,
				),
				startAfter,
			},
		);
	} catch (error) {
		await releaseToDraft(id, ["SCHEDULED", "QUEUED"]);
		await failJob(jobProgressId, "Could not queue the campaign");
		throw error;
	}

	return { jobProgressId };
}

async function releaseToDraft(
	id: string,
	from: EmailCampaignStatus[],
): Promise<number> {
	const released = await prisma.emailCampaign.updateMany({
		where: { id, status: { in: from } },
		data: {
			status: "DRAFT",
			scheduledAt: null,
			renderedHtml: null,
			jobProgressId: null,
		},
	});
	return released.count;
}

export async function cancelScheduledSend(id: string): Promise<void> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id },
		select: { jobProgressId: true },
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });

	if ((await releaseToDraft(id, ["SCHEDULED"])) === 0) {
		throw new Response("Campaign is no longer scheduled", { status: 409 });
	}
	if (campaign.jobProgressId) {
		await failJob(campaign.jobProgressId, "Schedule cancelled");
	}
}
