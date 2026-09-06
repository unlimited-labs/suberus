import { env } from "@/env.ts";
import type { EmailCampaignFormat } from "@/generated/prisma/enums";
import { lookup } from "@/shared/lib/lookup";
import { prisma } from "@/shared/server/db.server";
import { sendRawEmail } from "@/shared/server/email";
import { createJobProgress } from "@/shared/server/job-progress";
import { ensureQueueAndSend } from "@/shared/server/queue";
import {
	applyPlaceholders,
	BUILTIN_PLACEHOLDER_KEYS,
	extractTokens,
	parseRecipientData,
	pickRandom,
	recipientValues,
	type RecipientSnapshot,
	SAMPLE_VALUES,
	unknownTokens,
} from "../lib/placeholders";
import type {
	PlaceholderIssues,
	SheetCampaignCreateInput,
} from "../validations";
import {
	copyCampaignAttachments,
	deleteCampaignAttachments,
	listCampaignAttachments,
	loadAttachmentBuffers,
} from "./attachments";
import { renderEmailContent } from "./bulk-email-render";
import { campaignExpireSeconds } from "./bulk-email-status";
import { buildRecipientSnapshot } from "./recipient-snapshot";
import { matchSheetRows } from "./sheet-match";

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
	const campaignId = await insertCampaign(snapshots, createdById, []);

	return { campaignId, totalRecipients: snapshots.length };
}

export async function insertCampaign(
	snapshots: RecipientSnapshot[],
	createdById: string,
	dataKeys: string[],
	base?: Pick<SaveDraftInput, "subject" | "format" | "bodySource"> & {
		replyTo: string | null;
	},
): Promise<string> {
	const campaign = await prisma.emailCampaign.create({
		data: {
			...base,
			createdById,
			dataKeys,
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

const RECIPIENT_USER_SELECT = {
	id: true,
	email: true,
	firstName: true,
	lastName: true,
	submissions: {
		where: { type: { not: "INVITED" } },
		select: { title: true },
	},
} as const;

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
	const users = await prisma.user.findMany({
		where: {
			id: {
				in: match.rows.flatMap((r) => (r.kind === "user" ? [r.userId] : [])),
			},
		},
		select: RECIPIENT_USER_SELECT,
	});
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
		dataKeys.map((m) => m.key),
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
		src.dataKeys,
		{
			subject: src.subject,
			format: src.format,
			bodySource: src.bodySource,
			replyTo: src.replyTo,
		},
	);

	await copyCampaignAttachments(id, campaignId, createdById);

	return { campaignId };
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

export async function placeholderIssues(
	id: string,
	tokens: string[],
): Promise<PlaceholderIssues> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id },
		select: { dataKeys: true },
	});
	if (!campaign) throw new Response("Campaign not found", { status: 404 });

	const known = [...BUILTIN_PLACEHOLDER_KEYS, ...campaign.dataKeys];
	const unknown = unknownTokens(tokens, known);
	const used = tokens.filter((t) => known.includes(t));
	if (used.length === 0) return { unknown, missing: [] };

	const recipients = await prisma.emailCampaignRecipient.findMany({
		where: { campaignId: id },
		select: {
			email: true,
			firstName: true,
			lastName: true,
			titles: true,
			data: true,
		},
		orderBy: [{ email: "asc" }],
	});
	const values = recipients.map((r) => ({
		email: r.email,
		values: recipientValues({ ...r, data: parseRecipientData(r.data) }),
	}));

	const missing = used.flatMap((key) => {
		const empty = values.filter((v) => !lookup(v.values, key));
		return empty.length === 0
			? []
			: [
					{
						key,
						count: empty.length,
						sample: empty.slice(0, 5).map((v) => v.email),
					},
				];
	});

	return { unknown, missing };
}

async function assertKnownPlaceholders(
	id: string,
	subject: string,
	bodySource: string,
): Promise<void> {
	const { unknown } = await placeholderIssues(
		id,
		extractTokens(`${subject}
${bodySource}`),
	);
	if (unknown.length > 0) {
		throw new Response(
			`Unknown placeholders: ${unknown.map((t) => `{{${t}}}`).join(", ")}`,
			{ status: 400 },
		);
	}
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
	await assertKnownPlaceholders(id, campaign.subject, campaign.bodySource);

	const rendered = await renderEmailContent(
		campaign.format,
		campaign.bodySource,
	);
	const sample = pickRandom(campaign.recipients);
	const values = sample
		? recipientValues({ ...sample, data: parseRecipientData(sample.data) })
		: SAMPLE_VALUES;

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
	await assertKnownPlaceholders(id, campaign.subject, campaign.bodySource);

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
