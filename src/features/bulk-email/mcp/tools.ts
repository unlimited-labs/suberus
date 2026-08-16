import { z } from "zod";
import {
	createDraftCampaign,
	finalizeAndEnqueue,
	getCampaign,
	listCampaigns,
	saveDraft,
	sendCampaignTest,
} from "@/features/bulk-email/server/bulk-email";
import {
	campaignCreateInput,
	campaignDraftInput,
	campaignIdInput,
} from "@/features/bulk-email/validations";
import { MCP_SCOPE_EMAIL_SEND } from "@/features/mcp/scopes";
import {
	ADMIN_AND_EDITOR,
	defineTool,
	type McpTool,
} from "@/shared/server/mcp/define-tool";

const createDraft = defineTool({
	name: "email_draft_create",
	title: "Create email draft",
	description:
		"Start an email campaign addressed to the given user ids (get them from users_list). Recipient names and submission titles are snapshotted now, so later profile edits don't change the send. Ids that no longer exist are dropped silently — check the returned totalRecipients against what you asked for. Fill the campaign in with email_draft_update.",
	input: campaignCreateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_EMAIL_SEND,
	async handler(input, actor) {
		return createDraftCampaign(input.userIds, actor.id);
	},
});

const updateDraft = defineTool({
	name: "email_draft_update",
	title: "Update email draft",
	description:
		"Set subject, body and format of a draft campaign. Format is PLAIN, MARKDOWN or MJML. The body may use the placeholders {{firstName}}, {{lastName}} and {{title}}, filled per recipient. Every field is overwritten, including replyTo when omitted, so send the whole draft. Only works while the campaign is still a draft.",
	input: campaignDraftInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_EMAIL_SEND,
	destructive: true,
	async handler(input) {
		const { id, ...draft } = input;
		await saveDraft(id, draft);
		return { success: true };
	},
});

const sendTest = defineTool({
	name: "email_draft_test",
	title: "Send test email",
	description:
		"Send a single [TEST] copy of the draft to your own account address, with placeholders filled from a random recipient. Use it before email_send.",
	input: campaignIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_EMAIL_SEND,
	async handler(input, actor) {
		await sendCampaignTest(input.id, actor.email);
		return { sentTo: actor.email };
	},
});

const sendCampaign = defineTool({
	name: "email_send",
	title: "Send email campaign",
	description:
		"Queue the campaign for delivery to every recipient. Irreversible — the emails go out. Confirm the recipient count with email_campaign_get and preview with email_draft_test first.",
	input: campaignIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_EMAIL_SEND,
	destructive: true,
	async handler(input, actor) {
		return finalizeAndEnqueue(input.id, actor.id);
	},
});

const getCampaignTool = defineTool({
	name: "email_campaign_get",
	title: "Get email campaign",
	description:
		"Fetch one campaign: subject, body, status, sent/failed counts and up to 200 recipient rows with their per-recipient delivery status.",
	input: campaignIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_EMAIL_SEND,
	readOnly: true,
	async handler(input) {
		const { renderedHtml, ...campaign } = await getCampaign(input.id);
		return campaign;
	},
});

const listCampaignsTool = defineTool({
	name: "email_campaign_list",
	title: "List email campaigns",
	description:
		"List the 100 most recent email campaigns with their status and delivery counts.",
	input: z.object({}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_EMAIL_SEND,
	readOnly: true,
	async handler() {
		return listCampaigns();
	},
});

export const bulkEmailMcpTools: readonly McpTool[] = [
	createDraft,
	updateDraft,
	sendTest,
	sendCampaign,
	getCampaignTool,
	listCampaignsTool,
];
