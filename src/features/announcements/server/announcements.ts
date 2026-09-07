import { lookup } from "@/shared/lib/lookup";
import {
	applyPlaceholders,
	BUILTIN_PLACEHOLDER_KEYS,
	extractTokens,
	parseDataColumns,
	parseRecipientData,
	type PlaceholderIssues,
	type RecipientSnapshot,
	recipientValues,
	unknownTokens,
} from "@/shared/lib/placeholders";
import { buildRecipientSnapshot } from "@/shared/lib/recipient-snapshot";
import { prisma } from "@/shared/server/db.server";
import {
	loadRecipientSnapshots,
	loadSnapshotUsers,
} from "@/shared/server/recipient-snapshot";
import { matchSheetRows } from "@/shared/server/sheet-match";
import type { SheetAnnouncementCreateInput } from "../validations";
import { markdownToAnnouncementHtml } from "./sanitize";

export interface SaveAnnouncementDraftInput {
	subject: string;
	bodySource: string;
}

/** Cap on recipient rows hydrated into the composer; `totalRecipients` holds the truth. */
export const RECIPIENT_PREVIEW_LIMIT = 200;

/** Rows updated per transaction at publish. */
const PUBLISH_CHUNK = 500;

export async function insertAnnouncement(
	snapshots: RecipientSnapshot[],
	createdById: string,
	dataColumns: Record<string, string>,
): Promise<string> {
	const announcement = await prisma.announcement.create({
		data: {
			createdById,
			dataColumns,
			totalRecipients: snapshots.length,
			recipients: {
				create: snapshots.flatMap((s) =>
					s.userId === null
						? []
						: [
								{
									userId: s.userId,
									firstName: s.firstName,
									lastName: s.lastName,
									titles: s.titles,
									data: s.data,
								},
							],
				),
			},
		},
	});
	return announcement.id;
}

export async function createDraftAnnouncement(
	userIds: string[],
	createdById: string,
): Promise<{ announcementId: string; totalRecipients: number }> {
	const snapshots = await loadRecipientSnapshots(userIds);
	if (snapshots.length === 0) {
		throw new Response("No valid recipients selected", { status: 400 });
	}
	const announcementId = await insertAnnouncement(snapshots, createdById, {});
	return { announcementId, totalRecipients: snapshots.length };
}

export async function createAnnouncementFromSheet(
	input: SheetAnnouncementCreateInput,
	createdById: string,
): Promise<{ announcementId: string; totalRecipients: number }> {
	const match = await matchSheetRows(input);
	if (match.problems.length > 0) {
		throw new Response("Fix the spreadsheet problems before importing", {
			status: 400,
		});
	}
	const strangers = match.rows.filter((r) => r.kind === "unknown");
	if (strangers.length > 0 && !input.ignoreUnmatched) {
		throw new Response(
			`${strangers.length} address(es) have no Suberus account; set ignoreUnmatched to drop them`,
			{ status: 400 },
		);
	}

	const dataKeys = input.mapping.flatMap(({ column, target }) =>
		target.kind === "data" ? [{ column, key: target.key }] : [],
	);
	const users = await loadSnapshotUsers(
		match.rows.flatMap((r) => (r.kind === "user" ? [r.userId] : [])),
	);
	const byId = new Map(users.map((u) => [u.id, u]));

	const snapshots = match.rows.flatMap((matched): RecipientSnapshot[] => {
		if (matched.kind !== "user") return [];
		const user = byId.get(matched.userId);
		if (!user) return [];
		const row = input.sheet.rows[matched.row] ?? [];
		return [
			{
				...buildRecipientSnapshot(user),
				data: Object.fromEntries(
					dataKeys.map(({ column, key }) => [key, row[column] ?? ""]),
				),
			},
		];
	});

	if (snapshots.length === 0) {
		throw new Response("No recipients left to import", { status: 400 });
	}

	const announcementId = await insertAnnouncement(
		snapshots,
		createdById,
		Object.fromEntries(
			dataKeys.map(({ column, key }) => [
				key,
				input.sheet.columns[column] ?? key,
			]),
		),
	);
	return { announcementId, totalRecipients: snapshots.length };
}

export async function getAnnouncement(id: string) {
	const announcement = await prisma.announcement.findUnique({
		where: { id },
		include: {
			recipients: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					titles: true,
					readAt: true,
					renderedSubject: true,
					user: { select: { email: true } },
				},
				orderBy: [{ id: "asc" }],
				take: RECIPIENT_PREVIEW_LIMIT,
			},
		},
	});
	if (!announcement)
		throw new Response("Announcement not found", { status: 404 });
	// Counted, not derived from `recipients`: that list stops at RECIPIENT_PREVIEW_LIMIT.
	const readCount = await prisma.announcementRecipient.count({
		where: { announcementId: id, readAt: { not: null } },
	});
	return {
		...announcement,
		readCount,
		recipients: announcement.recipients.map(
			({ user, renderedSubject, ...recipient }) => ({
				...recipient,
				email: user.email,
				hasArchive: renderedSubject !== null,
			}),
		),
		dataColumns: parseDataColumns(announcement.dataColumns),
	};
}

export async function listAnnouncements() {
	return prisma.announcement.findMany({
		where: { sourceCampaignId: null },
		select: {
			id: true,
			subject: true,
			status: true,
			totalRecipients: true,
			createdAt: true,
			publishedAt: true,
		},
		orderBy: { createdAt: "desc" },
		take: 100,
	});
}

export async function saveAnnouncementDraft(
	id: string,
	data: SaveAnnouncementDraftInput,
): Promise<void> {
	const announcement = await prisma.announcement.findUnique({
		where: { id },
		select: { status: true },
	});
	if (!announcement)
		throw new Response("Announcement not found", { status: 404 });
	if (announcement.status !== "DRAFT") {
		throw new Response("Announcement already published", { status: 409 });
	}
	await prisma.announcement.update({
		where: { id },
		data: { subject: data.subject, bodySource: data.bodySource },
	});
}

export async function deleteAnnouncement(id: string): Promise<void> {
	const announcement = await prisma.announcement.findUnique({
		where: { id },
		select: { status: true },
	});
	if (!announcement)
		throw new Response("Announcement not found", { status: 404 });
	// Deleting a published one would empty every recipient's inbox behind their back.
	if (announcement.status !== "DRAFT") {
		throw new Response("Announcement already published", { status: 409 });
	}
	await prisma.announcement.delete({ where: { id } });
}

export async function placeholderIssues(
	id: string,
	tokens: string[],
): Promise<PlaceholderIssues> {
	const announcement = await prisma.announcement.findUnique({
		where: { id },
		select: { dataColumns: true },
	});
	if (!announcement)
		throw new Response("Announcement not found", { status: 404 });

	const known = [
		...BUILTIN_PLACEHOLDER_KEYS,
		...Object.keys(parseDataColumns(announcement.dataColumns)),
	];
	const knownSet = new Set(known);
	const unknown = unknownTokens(tokens, known);
	const used = tokens.filter((t) => knownSet.has(t));
	if (used.length === 0) return { unknown, missing: [] };

	const recipients = await prisma.announcementRecipient.findMany({
		where: { announcementId: id },
		select: {
			firstName: true,
			lastName: true,
			titles: true,
			data: true,
			user: { select: { email: true } },
		},
	});
	const values = recipients.map((r) => ({
		email: r.user.email,
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

export async function publishAnnouncement(
	id: string,
): Promise<{ totalRecipients: number }> {
	const announcement = await prisma.announcement.findUnique({ where: { id } });
	if (!announcement)
		throw new Response("Announcement not found", { status: 404 });
	if (announcement.status !== "DRAFT") {
		throw new Response("Announcement already published", { status: 409 });
	}
	if (announcement.totalRecipients === 0) {
		throw new Response("Announcement has no recipients", { status: 400 });
	}
	if (!announcement.subject.trim() || !announcement.bodySource.trim()) {
		throw new Response("Subject and body are required", { status: 400 });
	}
	await assertKnownPlaceholders(
		id,
		announcement.subject,
		announcement.bodySource,
	);

	const renderedHtml = markdownToAnnouncementHtml(announcement.bodySource);
	const recipients = await prisma.announcementRecipient.findMany({
		where: { announcementId: id },
		select: {
			id: true,
			firstName: true,
			lastName: true,
			titles: true,
			data: true,
		},
	});
	const publishedAt = new Date();

	// ponytail: 500-row chunks; a batch update via unnest if an announcement ever
	// outgrows MAX_SHEET_ROWS.
	for (let i = 0; i < recipients.length; i += PUBLISH_CHUNK) {
		const chunk = recipients.slice(i, i + PUBLISH_CHUNK);
		await prisma.$transaction(
			chunk.map((recipient) => {
				const values = recipientValues({
					...recipient,
					data: parseRecipientData(recipient.data),
				});
				return prisma.announcementRecipient.update({
					where: { id: recipient.id },
					data: {
						renderedSubject: applyPlaceholders(
							announcement.subject,
							values,
							false,
						),
						renderedBody: applyPlaceholders(renderedHtml, values, true),
						publishedAt,
					},
				});
			}),
		);
	}

	await prisma.announcement.update({
		where: { id },
		data: { status: "PUBLISHED", renderedHtml, publishedAt },
	});

	return { totalRecipients: recipients.length };
}
