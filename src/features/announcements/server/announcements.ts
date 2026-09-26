import type { AnnouncementStatus } from "@/generated/prisma/enums";
import {
	assertKnownPlaceholders,
	collectPlaceholderIssues,
} from "@/shared/lib/placeholder-issues";
import {
	parseDataColumns,
	type PlaceholderIssues,
	type RecipientSnapshot,
} from "@/shared/lib/placeholders";
import { buildRecipientSnapshot } from "@/shared/lib/recipient-snapshot";
import { FUTURE_INSTANT_MESSAGE, isFutureInstant } from "@/shared/lib/schedule";
import { prisma } from "@/shared/server/db.server";
import { ensureQueueAndSend } from "@/shared/server/queue";
import {
	loadRecipientSnapshots,
	loadSnapshotUsers,
} from "@/shared/server/recipient-snapshot";
import { matchSheetRows } from "@/shared/server/sheet-match";
import type { SheetAnnouncementCreateInput } from "../validations";
import { deliverAnnouncement } from "./deliver";
import { markdownToAnnouncementHtml } from "./sanitize";

export interface SaveAnnouncementDraftInput {
	subject: string;
	bodySource: string;
}

/** Cap on recipient rows hydrated into the composer; `totalRecipients` holds the truth. */
export const RECIPIENT_PREVIEW_LIMIT = 200;

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
			scheduledAt: true,
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
	if (!announcement) {
		throw new Response("Announcement not found", { status: 404 });
	}

	return collectPlaceholderIssues(
		announcement.dataColumns,
		tokens,
		async () => {
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
			return recipients.map((r) => ({ ...r, email: r.user.email }));
		},
	);
}

export async function publishAnnouncement(
	id: string,
	scheduledAt?: string,
): Promise<{ totalRecipients: number }> {
	if (scheduledAt !== undefined && !isFutureInstant(scheduledAt)) {
		throw new Response(FUTURE_INSTANT_MESSAGE, { status: 400 });
	}
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
		(tokens) => placeholderIssues(id, tokens),
		announcement.subject,
		announcement.bodySource,
	);

	const renderedHtml = markdownToAnnouncementHtml(announcement.bodySource);

	if (scheduledAt) {
		await prisma.announcement.update({
			where: { id },
			data: {
				status: "SCHEDULED",
				scheduledAt: new Date(scheduledAt),
				renderedHtml,
			},
		});
		try {
			await ensureQueueAndSend(
				"announcement-publish",
				{ announcementId: id, scheduledAt },
				{ retryLimit: 3, retryDelay: 10, startAfter: new Date(scheduledAt) },
			);
		} catch (error) {
			await releaseAnnouncementToDraft(id, ["SCHEDULED"]);
			throw error;
		}
		return { totalRecipients: announcement.totalRecipients };
	}

	const claimed = await prisma.announcement.updateMany({
		where: { id, status: "DRAFT" },
		data: { status: "PUBLISHING", renderedHtml },
	});
	if (claimed.count === 0) {
		throw new Response("Announcement already published", { status: 409 });
	}
	try {
		return await deliverAnnouncement(id, {
			subject: announcement.subject,
			renderedHtml,
		});
	} catch (error) {
		await releaseAnnouncementToDraft(id, ["PUBLISHING"]);
		throw error;
	}
}

export async function releaseAnnouncementToDraft(
	id: string,
	from: AnnouncementStatus[],
): Promise<number> {
	const released = await prisma.announcement.updateMany({
		where: { id, status: { in: from } },
		data: { status: "DRAFT", scheduledAt: null, renderedHtml: null },
	});
	return released.count;
}

export async function cancelScheduledPublish(id: string): Promise<void> {
	if ((await releaseAnnouncementToDraft(id, ["SCHEDULED"])) === 0) {
		throw new Response("Announcement is no longer scheduled", { status: 409 });
	}
}
