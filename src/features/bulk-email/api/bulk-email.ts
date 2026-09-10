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
	createCampaignFromSheet,
	createDraftCampaign,
	deleteCampaign,
	cancelScheduledSend,
	duplicateCampaign,
	finalizeAndEnqueue,
	getCampaign,
	getSentMessage,
	listCampaigns,
	placeholderIssues,
	previewContent,
	saveDraft,
	sendCampaignTest,
} from "@/features/bulk-email/server/bulk-email";
import {
	campaignCheckInput,
	campaignCreateInput,
	campaignDraftInput,
	type campaignFormatSchema,
	campaignIdInput,
	campaignPreviewInput,
	campaignSendInput,
	recipientIdInput,
	sheetCampaignCreateInput,
} from "@/features/bulk-email/validations";
import { sheetMatchInput } from "@/shared/lib/sheet-mapping";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";
import { matchSheetRows } from "@/shared/server/sheet-match";
import { parseSheetBuffer } from "@/shared/server/sheet-parse";
import {
	UploadValidationError,
	validateUpload,
} from "@/shared/server/validate-upload";

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

export const getBulkEmailSentMessage = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(recipientIdInput)
	.handler(async ({ data }) => {
		return getSentMessage(data.recipientId);
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
	.validator(campaignSendInput)
	.handler(async ({ data, context }) => {
		return finalizeAndEnqueue(data.id, context.user.id, data.scheduledAt);
	});

export const cancelScheduledBulkEmail = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(campaignIdInput)
	.handler(async ({ data }) => {
		await cancelScheduledSend(data.id);
		return { success: true };
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

// A legacy .xls is a CFB container, which is all file-type can tell us; a
// non-workbook that reaches parseSheetBuffer is rejected there.
const SHEET_EXTENSIONS = ["xlsx", "cfb"] as const;
const MAX_SHEET_BYTES = 5 * 1024 * 1024;

export const parseBulkEmailSheet = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data }) => {
		const buffer = await fileToBuffer(data.file);
		await validateUpload(buffer, {
			allowedExtensions: SHEET_EXTENSIONS,
			maxBytes: MAX_SHEET_BYTES,
		});
		return parseSheetBuffer(buffer);
	});

export const matchBulkEmailSheet = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sheetMatchInput)
	.handler(({ data }) => matchSheetRows(data));

export const createBulkEmailDraftFromSheet = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sheetCampaignCreateInput)
	.handler(({ data, context }) =>
		createCampaignFromSheet(data, context.user.id),
	);

export const checkBulkEmailPlaceholders = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(campaignCheckInput)
	.handler(({ data }) => placeholderIssues(data.id, data.tokens));

export const bulkEmailCampaignQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["admin", "bulk-email", id],
		queryFn: () => getBulkEmailCampaign({ data: { id } }),
	});

/** Archived snapshot, immutable once written. */
export const bulkEmailSentMessageQueryOptions = (recipientId: string) =>
	queryOptions({
		queryKey: ["admin", "bulk-email", "sent-message", recipientId] as const,
		queryFn: () => getBulkEmailSentMessage({ data: { recipientId } }),
		staleTime: Number.POSITIVE_INFINITY,
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

export const bulkEmailPlaceholderIssuesQueryOptions = (
	id: string,
	tokens: string[],
) => {
	const sorted = tokens.toSorted();
	return queryOptions({
		queryKey: ["bulk-email", "placeholder-issues", id, sorted] as const,
		queryFn: () => checkBulkEmailPlaceholders({ data: { id, tokens: sorted } }),
		staleTime: Number.POSITIVE_INFINITY,
	});
};
