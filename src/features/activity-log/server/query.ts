import type { ActivityLogFilters } from "@/features/activity-log/validations";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/server/db.server";

export interface ActivityEntry {
	id: string;
	type: string;
	userId: string | null;
	submissionId: string | null;
	performerId: string | null;
	performerName: string | null;
	submissionTitle: string | null;
	userName: string | null;
	detail: Record<string, string | number | boolean | string[] | null> | null;
	createdAt: Date;
}

export interface ActivityPage {
	entries: ActivityEntry[];
	nextCursor: string | null;
}

function fullName(person: {
	firstName: string | null;
	lastName: string | null;
}): string | null {
	return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || null;
}

export async function listActivity(
	filters: ActivityLogFilters,
): Promise<ActivityPage> {
	const where: Prisma.ActivityLogWhereInput = {};
	if (filters.type?.length) where.type = { in: filters.type };
	if (filters.userId) where.userId = filters.userId;
	if (filters.submissionId) where.submissionId = filters.submissionId;
	if (filters.performedBy) where.performedBy = filters.performedBy;
	if (filters.since || filters.until) {
		where.createdAt = {
			...(filters.since ? { gte: new Date(filters.since) } : {}),
			...(filters.until ? { lt: new Date(filters.until) } : {}),
		};
	}

	// One past the page: cheaper than a second count, and the caller only needs
	// to know whether to ask again.
	const rows = await prisma.activityLog.findMany({
		where,
		take: filters.take + 1,
		...(filters.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
		orderBy: { createdAt: "desc" },
		include: {
			submission: { select: { id: true, title: true } },
			user: { select: { id: true, firstName: true, lastName: true } },
			performer: { select: { id: true, firstName: true, lastName: true } },
		},
	});

	const page = rows.slice(0, filters.take);

	return {
		entries: page.map((item) => ({
			id: item.id,
			type: item.type,
			userId: item.userId,
			submissionId: item.submissionId,
			performerId: item.performer?.id ?? null,
			performerName: item.performer ? fullName(item.performer) : null,
			submissionTitle: item.submission?.title ?? null,
			userName: item.user ? fullName(item.user) : null,
			detail: item.detail as ActivityEntry["detail"],
			createdAt: item.createdAt,
		})),
		nextCursor: rows.length > filters.take ? (page.at(-1)?.id ?? null) : null,
	};
}
