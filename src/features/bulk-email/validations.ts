import { z } from "zod";

/** Shared by the server fns in api/ and the MCP tools in mcp/. */
export const campaignFormatSchema = z.enum(["PLAIN", "MARKDOWN", "MJML"]);

export const campaignIdInput = z.object({ id: z.uuid() });

export const campaignCreateInput = z.object({
	userIds: z.array(z.uuid()).min(1, "No recipients selected"),
});

export const campaignDraftInput = z.object({
	id: z.uuid(),
	subject: z.string(),
	format: campaignFormatSchema,
	bodySource: z.string(),
	replyTo: z.union([z.email(), z.literal("")]).optional(),
});

export const campaignPreviewInput = z.object({
	format: campaignFormatSchema,
	bodySource: z.string(),
});
