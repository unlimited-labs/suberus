import { prisma } from "@/shared/server/db.server";

/**
 * The in-app twin of a campaign, created at finalize so the worker only has to
 * fill each row in as its mail is accepted. Recipients imported from a sheet
 * with no Suberus account are skipped — they have no inbox.
 */
export async function createCampaignAnnouncement(input: {
	campaignId: string;
	createdById: string;
	subject: string;
	bodySource: string;
	renderedBodyTemplate: string;
	dataColumns: Record<string, string>;
	userIds: string[];
}): Promise<string | null> {
	if (input.userIds.length === 0) return null;
	const content = {
		subject: input.subject,
		bodySource: input.bodySource,
		renderedHtml: input.renderedBodyTemplate,
		dataColumns: input.dataColumns,
		totalRecipients: input.userIds.length,
	};
	// Upserted, not created: a retried or re-scheduled finalize must neither hit
	// the unique sourceCampaignId nor deliver the content of the abandoned run.
	const announcement = await prisma.announcement.upsert({
		where: { sourceCampaignId: input.campaignId },
		update: {
			...content,
			recipients: {
				deleteMany: {},
				create: input.userIds.map((userId) => ({ userId })),
			},
		},
		create: {
			...content,
			sourceCampaignId: input.campaignId,
			createdById: input.createdById,
			status: "PUBLISHED",
			publishedAt: new Date(),
			recipients: { create: input.userIds.map((userId) => ({ userId })) },
		},
	});
	return announcement.id;
}
