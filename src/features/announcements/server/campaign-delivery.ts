import { applyPlaceholders } from "@/shared/lib/placeholders";
import { prisma } from "@/shared/server/db.server";

// Kept free of ./sanitize: this module runs inside the pg-boss worker, and the
// sanitizer pulls jsdom, whose import at worker-registration time kills queues.
export async function findCampaignAnnouncement(campaignId: string) {
	return prisma.announcement.findUnique({
		where: { sourceCampaignId: campaignId },
		select: { id: true, renderedHtml: true },
	});
}

export async function deliverCampaignAnnouncement(input: {
	announcementId: string;
	userId: string;
	subject: string;
	bodyTemplate: string;
	values: Record<string, string>;
}): Promise<void> {
	await prisma.announcementRecipient.updateMany({
		where: { announcementId: input.announcementId, userId: input.userId },
		data: {
			renderedSubject: input.subject,
			renderedBody: applyPlaceholders(input.bodyTemplate, input.values, true),
			publishedAt: new Date(),
		},
	});
}
