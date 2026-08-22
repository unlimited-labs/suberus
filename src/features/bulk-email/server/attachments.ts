import { EMAIL_ATTACHMENT_EXTENSIONS } from "@/features/settings/file-types";
import { logger } from "@/logger.ts";
import { prisma } from "@/shared/server/db.server";
import {
	deleteFile,
	generateCampaignAttachmentKey,
	getFileBuffer,
	uploadFile,
} from "@/shared/server/storage";
import {
	UploadValidationError,
	validateUpload,
} from "@/shared/server/validate-upload";
import {
	assertTotalWithinCap,
	MAX_ATTACHMENT_FILE_BYTES,
} from "../lib/attachment-limits";

export interface CampaignAttachment {
	id: string;
	originalName: string;
	size: number;
	mimeType: string;
}

const attachmentSelect = {
	id: true,
	originalName: true,
	size: true,
	mimeType: true,
} as const;

async function requireDraft(campaignId: string): Promise<void> {
	const campaign = await prisma.emailCampaign.findUnique({
		where: { id: campaignId },
		select: { status: true },
	});
	if (!campaign) throw new UploadValidationError("Campaign not found.");
	if (campaign.status !== "DRAFT") {
		throw new UploadValidationError(
			"Attachments can only be changed in a draft.",
		);
	}
}

export function listCampaignAttachments(
	campaignId: string,
): Promise<CampaignAttachment[]> {
	return prisma.file.findMany({
		where: { entityType: "EMAIL_CAMPAIGN", entityId: campaignId },
		select: attachmentSelect,
		orderBy: { createdAt: "asc" },
	});
}

export async function addCampaignAttachment(
	campaignId: string,
	buffer: Buffer,
	originalName: string,
	uploadedById: string,
): Promise<CampaignAttachment> {
	await requireDraft(campaignId);

	const detected = await validateUpload(buffer, {
		allowedExtensions: EMAIL_ATTACHMENT_EXTENSIONS,
		maxBytes: MAX_ATTACHMENT_FILE_BYTES,
	});

	const existing = await prisma.file.aggregate({
		where: { entityType: "EMAIL_CAMPAIGN", entityId: campaignId },
		_sum: { size: true },
	});
	assertTotalWithinCap(existing._sum.size ?? 0, buffer.length);

	const storageKey = generateCampaignAttachmentKey(campaignId, originalName);
	await uploadFile(buffer, storageKey, detected.mime);

	return prisma.file.create({
		data: {
			entityType: "EMAIL_CAMPAIGN",
			entityId: campaignId,
			type: "EMAIL_ATTACHMENT",
			storageKey,
			fileName: originalName,
			originalName,
			mimeType: detected.mime,
			size: buffer.length,
			uploadedById,
		},
		select: attachmentSelect,
	});
}

export async function removeCampaignAttachment(fileId: string): Promise<void> {
	const file = await prisma.file.findUnique({
		where: { id: fileId },
		select: { id: true, entityType: true, entityId: true, storageKey: true },
	});
	if (file?.entityType !== "EMAIL_CAMPAIGN") {
		throw new UploadValidationError("Attachment not found.");
	}
	await requireDraft(file.entityId);

	await deleteFile(file.storageKey).catch((err) => {
		logger.error(
			`[bulk-email] failed to delete attachment ${file.storageKey}:`,
			err,
		);
	});
	await prisma.file.delete({ where: { id: file.id } });
}

export async function deleteCampaignAttachments(
	campaignId: string,
): Promise<void> {
	const files = await prisma.file.findMany({
		where: { entityType: "EMAIL_CAMPAIGN", entityId: campaignId },
		select: { id: true, storageKey: true },
	});
	await Promise.all(
		files.map((file) =>
			deleteFile(file.storageKey).catch((err) => {
				logger.error(
					`[bulk-email] failed to delete attachment ${file.storageKey}:`,
					err,
				);
			}),
		),
	);
	await prisma.file.deleteMany({
		where: { entityType: "EMAIL_CAMPAIGN", entityId: campaignId },
	});
}

export async function copyCampaignAttachments(
	srcId: string,
	dstId: string,
	uploadedById: string | null,
): Promise<void> {
	const files = await prisma.file.findMany({
		where: { entityType: "EMAIL_CAMPAIGN", entityId: srcId },
		select: { originalName: true, mimeType: true, storageKey: true },
	});
	await Promise.all(
		files.map(async (file) => {
			const buffer = await getFileBuffer(file.storageKey);
			const storageKey = generateCampaignAttachmentKey(
				dstId,
				file.originalName,
			);
			await uploadFile(buffer, storageKey, file.mimeType);
			await prisma.file.create({
				data: {
					entityType: "EMAIL_CAMPAIGN",
					entityId: dstId,
					type: "EMAIL_ATTACHMENT",
					storageKey,
					fileName: file.originalName,
					originalName: file.originalName,
					mimeType: file.mimeType,
					size: buffer.length,
					uploadedById,
				},
			});
		}),
	);
}

export interface MailAttachment {
	filename: string;
	content: Buffer;
}

export async function loadAttachmentBuffers(
	campaignId: string,
): Promise<MailAttachment[]> {
	const files = await prisma.file.findMany({
		where: { entityType: "EMAIL_CAMPAIGN", entityId: campaignId },
		select: { originalName: true, storageKey: true },
		orderBy: { createdAt: "asc" },
	});
	return Promise.all(
		files.map(async (file) => ({
			filename: file.originalName,
			content: await getFileBuffer(file.storageKey),
		})),
	);
}
