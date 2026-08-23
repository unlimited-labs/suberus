import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/features/auth/server/middleware";
import {
	addCampaignAttachment,
	type CampaignAttachment,
	removeCampaignAttachment,
} from "@/features/bulk-email/server/attachments";
import {
	createDraftCampaign,
	deleteCampaign,
	duplicateCampaign,
	finalizeAndEnqueue,
	getCampaign,
	listCampaigns,
	previewContent,
	saveDraft,
	sendCampaignTest,
} from "@/features/bulk-email/server/bulk-email";
import {
	campaignCreateInput,
	campaignDraftInput,
	type campaignFormatSchema,
	campaignIdInput,
	campaignPreviewInput,
} from "@/features/bulk-email/validations";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";
import { UploadValidationError } from "@/shared/server/validate-upload";

export const createBulkEmailDraft = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(campaignCreateInput)
	.handler(async ({ data, context }) => {
		return createDraftCampaign(data.userIds, context.user.id);
	});

export const getBulkEmailCampaign = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(campaignIdInput)
	.handler(async ({ data }) => {
		return getCampaign(data.id);
	});

export const listBulkEmailCampaigns = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return listCampaigns();
	});

export const saveBulkEmailDraft = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(campaignDraftInput)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await saveDraft(id, rest);
		return { success: true };
	});

export const previewBulkEmail = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(campaignPreviewInput)
	.handler(async ({ data }) => {
		return previewContent(data.format, data.bodySource);
	});

export const sendBulkEmailTest = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(campaignIdInput)
	.handler(async ({ data, context }) => {
		await sendCampaignTest(data.id, context.user.email);
		return { sentTo: context.user.email };
	});

export const sendBulkEmailCampaign = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(campaignIdInput)
	.handler(async ({ data, context }) => {
		return finalizeAndEnqueue(data.id, context.user.id);
	});

export const deleteBulkEmailCampaign = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(campaignIdInput)
	.handler(async ({ data }) => {
		await deleteCampaign(data.id);
		return { success: true };
	});

export const duplicateBulkEmailCampaign = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(campaignIdInput)
	.handler(async ({ data, context }) => {
		return duplicateCampaign(data.id, context.user.id);
	});

type UploadAttachmentResult =
	| { success: true; attachment: CampaignAttachment }
	| { success: false; error: string };

export const uploadBulkEmailAttachment = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator((data: FormData) =>
		z.object({ campaignId: z.uuid(), file: z.instanceof(File) }).parse({
			campaignId: data.get("campaignId"),
			file: getUploadedFile(data),
		}),
	)
	.handler(async ({ data, context }): Promise<UploadAttachmentResult> => {
		try {
			const buffer = await fileToBuffer(data.file);
			const attachment = await addCampaignAttachment(
				data.campaignId,
				buffer,
				data.file.name,
				context.user.id,
			);
			return { success: true, attachment };
		} catch (error) {
			if (error instanceof UploadValidationError) {
				return { success: false, error: error.message };
			}
			throw error;
		}
	});

const fileIdSchema = z.object({ fileId: z.uuid() });

export const deleteBulkEmailAttachment = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(fileIdSchema)
	.handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
		try {
			await removeCampaignAttachment(data.fileId);
			return { success: true };
		} catch (error) {
			if (error instanceof UploadValidationError) {
				return { success: false, error: error.message };
			}
			throw error;
		}
	});

export const bulkEmailCampaignQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["admin", "bulk-email", id],
		queryFn: () => getBulkEmailCampaign({ data: { id } }),
	});

export const bulkEmailCampaignsQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "bulk-email", "list"],
		queryFn: () => listBulkEmailCampaigns(),
	});

export const bulkEmailPreviewQueryOptions = (
	format: z.infer<typeof campaignFormatSchema>,
	bodySource: string,
) =>
	queryOptions({
		queryKey: ["bulk-email", "preview", format, bodySource] as const,
		queryFn: () => previewBulkEmail({ data: { format, bodySource } }),
		staleTime: Number.POSITIVE_INFINITY,
	});
