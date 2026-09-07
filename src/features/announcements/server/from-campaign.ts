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
	const announcement = await prisma.announcement.create({
		data: {
			sourceCampaignId: input.campaignId,
			createdById: input.createdById,
			subject: input.subject,
			bodySource: input.bodySource,
			renderedHtml: input.renderedBodyTemplate,
			dataColumns: input.dataColumns,
			status: "PUBLISHED",
			publishedAt: new Date(),
			totalRecipients: input.userIds.length,
			recipients: { create: input.userIds.map((userId) => ({ userId })) },
		},
	});
	return announcement.id;
}
