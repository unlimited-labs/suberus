import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/features/auth/server/middleware";
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

const formatSchema = z.enum(["PLAIN", "MARKDOWN", "MJML"]);

const createDraftSchema = z.object({
	userIds: z.array(z.string()).min(1, "No recipients selected"),
});

export const createBulkEmailDraft = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(createDraftSchema)
	.handler(async ({ data, context }) => {
		return createDraftCampaign(data.userIds, context.user.id);
	});

const idSchema = z.object({ id: z.string() });

export const getBulkEmailCampaign = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(idSchema)
	.handler(async ({ data }) => {
		return getCampaign(data.id);
	});

export const listBulkEmailCampaigns = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return listCampaigns();
	});

const saveDraftSchema = z.object({
	id: z.string(),
	subject: z.string(),
	format: formatSchema,
	bodySource: z.string(),
});

export const saveBulkEmailDraft = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(saveDraftSchema)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await saveDraft(id, rest);
		return { success: true };
	});

const previewSchema = z.object({
	format: formatSchema,
	bodySource: z.string(),
});

export const previewBulkEmail = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(previewSchema)
	.handler(async ({ data }) => {
		return previewContent(data.format, data.bodySource);
	});

export const sendBulkEmailTest = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(idSchema)
	.handler(async ({ data, context }) => {
		await sendCampaignTest(data.id, context.user.email);
		return { sentTo: context.user.email };
	});

export const sendBulkEmailCampaign = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(idSchema)
	.handler(async ({ data, context }) => {
		return finalizeAndEnqueue(data.id, context.user.id);
	});

export const deleteBulkEmailCampaign = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(idSchema)
	.handler(async ({ data }) => {
		await deleteCampaign(data.id);
		return { success: true };
	});

export const duplicateBulkEmailCampaign = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(idSchema)
	.handler(async ({ data, context }) => {
		return duplicateCampaign(data.id, context.user.id);
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
