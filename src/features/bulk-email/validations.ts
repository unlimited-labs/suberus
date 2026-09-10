import { z } from "zod";
import { scheduledAtInput } from "@/shared/lib/schedule";
import {
	refineSheetCreate,
	sheetCreateShape,
} from "@/shared/lib/sheet-mapping";

export const campaignFormatSchema = z.enum(["PLAIN", "MARKDOWN", "MJML"]);

export const campaignIdInput = z.object({ id: z.uuid() });

export const recipientIdInput = z.object({ recipientId: z.uuid() });

export const campaignCreateInput = z.object({
	userIds: z.array(z.uuid()).min(1, "No recipients selected"),
});

export const campaignDraftInput = z.object({
	id: z.uuid(),
	subject: z.string(),
	format: campaignFormatSchema,
	bodySource: z.string(),
	replyTo: z.union([z.email(), z.literal("")]).optional(),
	saveToProfile: z.boolean().optional(),
});

export const campaignSendInput = campaignIdInput.extend({
	scheduledAt: scheduledAtInput,
});

export const campaignPreviewInput = z.object({
	format: campaignFormatSchema,
	bodySource: z.string(),
});

export const campaignCheckInput = campaignIdInput.extend({
	tokens: z.array(z.string()).max(100),
});

export const sheetCampaignCreateInput =
	sheetCreateShape.superRefine(refineSheetCreate);

export type SheetCampaignCreateInput = z.infer<typeof sheetCampaignCreateInput>;
