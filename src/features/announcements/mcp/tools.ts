import { z } from "zod";
import {
	createAnnouncementFromSheet,
	createDraftAnnouncement,
	getAnnouncement,
	listAnnouncements,
	placeholderIssues,
	publishAnnouncement,
	saveAnnouncementDraft,
} from "@/features/announcements/server/announcements";
import {
	announcementCheckInput,
	announcementCreateInput,
	announcementDraftInput,
	announcementIdInput,
	sheetAnnouncementCreateInput,
} from "@/features/announcements/validations";
import { MCP_SCOPE_ANNOUNCEMENTS } from "@/features/mcp/scopes";
import { sheetMatchInput } from "@/shared/lib/sheet-mapping";
import {
	ADMIN_AND_EDITOR,
	defineTool,
	type McpTool,
} from "@/shared/server/mcp/define-tool";
import { matchSheetRows } from "@/shared/server/sheet-match";

const createDraft = defineTool({
	name: "announcement_draft_create",
	title: "Create announcement draft",
	description:
		"Start an announcement addressed to the given user ids (get them from users_list). An announcement is read in the app on the recipient's dashboard; no email is sent. Names and submission titles are snapshotted now, so later profile edits don't change it. Ids that no longer exist are dropped silently — check the returned totalRecipients. Fill it in with announcement_draft_update.",
	input: announcementCreateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_ANNOUNCEMENTS,
	async handler(input, actor) {
		return createDraftAnnouncement(input.userIds, actor.id);
	},
});

const updateDraft = defineTool({
	name: "announcement_draft_update",
	title: "Update announcement draft",
	description:
		"Set the subject and markdown body of a draft announcement. The body is markdown only and may use the placeholders {{firstName}}, {{lastName}} and {{title}}, plus any key carried from an imported spreadsheet (announcement_get returns dataColumns, mapping each key to its spreadsheet heading). A token that matches no key blocks publishing, so check with announcement_draft_check. Both fields are overwritten, so send the whole draft. Only works while the announcement is still a draft.",
	input: announcementDraftInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_ANNOUNCEMENTS,
	destructive: true,
	async handler(input) {
		const { id, ...draft } = input;
		await saveAnnouncementDraft(id, draft);
		return { success: true };
	},
});

const checkDraft = defineTool({
	name: "announcement_draft_check",
	title: "Check announcement placeholders",
	description:
		"Report which of the given tokens are not placeholders on this announcement (unknown, blocks publishing) and which are known but empty for some recipients (missing, a warning). Pass the tokens you wrote in the subject and body.",
	input: announcementCheckInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_ANNOUNCEMENTS,
	readOnly: true,
	async handler(input) {
		return placeholderIssues(input.id, input.tokens);
	},
});

const matchSheet = defineTool({
	name: "announcement_sheet_match",
	title: "Match spreadsheet rows to accounts",
	description:
		"Given the columns and rows of a spreadsheet and which column holds the email address, report which rows belong to a Suberus account. Announcements need an account, so a row reported as kind 'unknown' is either removed from the file or dropped by passing ignoreUnmatched to announcement_draft_create_from_sheet.",
	input: sheetMatchInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_ANNOUNCEMENTS,
	readOnly: true,
	async handler(input) {
		return matchSheetRows(input);
	},
});

const createFromSheet = defineTool({
	name: "announcement_draft_create_from_sheet",
	title: "Create announcement from a spreadsheet",
	description:
		"Create a draft from spreadsheet rows, turning the columns you map to 'data' into per-recipient placeholders. Only addresses that already have a Suberus account become recipients — unlike an email campaign, an announcement cannot reach a stranger. Rows without an account are refused unless you pass ignoreUnmatched: true, which drops them. Check first with announcement_sheet_match.",
	input: sheetAnnouncementCreateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_ANNOUNCEMENTS,
	async handler(input, actor) {
		return createAnnouncementFromSheet(input, actor.id);
	},
});

const publish = defineTool({
	name: "announcement_publish",
	title: "Publish announcement",
	description:
		"Render the announcement for every recipient and put it on their dashboard. Irreversible: it cannot be unpublished, and after this only one person's copy can be edited at a time. Confirm the recipient count with announcement_get first.",
	input: announcementIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_ANNOUNCEMENTS,
	destructive: true,
	async handler(input) {
		return publishAnnouncement(input.id);
	},
});

const get = defineTool({
	name: "announcement_get",
	title: "Get announcement",
	description:
		"Read one announcement with its recipients (capped at 200), its dataColumns placeholder map and, once published, who has read it.",
	input: announcementIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_ANNOUNCEMENTS,
	readOnly: true,
	async handler(input) {
		return getAnnouncement(input.id);
	},
});

const list = defineTool({
	name: "announcement_list",
	title: "List announcements",
	description:
		"List the 100 most recent announcements, newest first. The in-app copies of email campaigns are not listed — read those with email_campaign_get.",
	input: z.object({}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_ANNOUNCEMENTS,
	readOnly: true,
	async handler() {
		return listAnnouncements();
	},
});

export const announcementMcpTools: readonly McpTool[] = [
	createDraft,
	updateDraft,
	checkDraft,
	matchSheet,
	createFromSheet,
	publish,
	get,
	list,
];
