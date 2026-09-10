import type { Job, PgBoss } from "pg-boss";
import { logger } from "@/logger.ts";
import { prisma } from "@/shared/server/db.server";
import {
	deliverAnnouncement,
	PUBLISHABLE_ANNOUNCEMENT_STATUSES,
} from "../deliver";

export interface AnnouncementPublishJobData {
	announcementId: string;
	scheduledAt?: string | null;
}

async function claim(id: string, scheduledAt: string | null): Promise<boolean> {
	const claimed = await prisma.announcement.updateMany({
		where: {
			id,
			status: { in: PUBLISHABLE_ANNOUNCEMENT_STATUSES },
			scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
		},
		data: { status: "PUBLISHING" },
	});
	if (claimed.count === 0) {
		logger.info(`[announcements] ${id} not claimable, skipping`);
		return false;
	}
	return true;
}

async function unclaimForRetry(id: string): Promise<void> {
	await prisma.announcement.updateMany({
		where: { id, status: "PUBLISHING" },
		data: { status: "SCHEDULED" },
	});
}

async function handlePublish(
	jobs: Job<AnnouncementPublishJobData>[],
): Promise<void> {
	for (const job of jobs) {
		const { announcementId } = job.data;
		if (!(await claim(announcementId, job.data.scheduledAt ?? null))) continue;
		try {
			const { totalRecipients } = await deliverAnnouncement(announcementId);
			logger.info(
				`[announcements] ${announcementId} published to ${totalRecipients} recipients`,
			);
		} catch (error) {
			await unclaimForRetry(announcementId);
			throw error;
		}
	}
}

export async function registerAnnouncementPublishWorker(
	boss: PgBoss,
): Promise<void> {
	await boss.work<AnnouncementPublishJobData>(
		"announcement-publish",
		{ localConcurrency: 1 },
		handlePublish,
	);
}
