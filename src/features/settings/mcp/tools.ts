import { z } from "zod";
import {
	MCP_SCOPE_CONFERENCE_READ,
	MCP_SCOPE_CONFERENCE_WRITE,
} from "@/features/auth/server/auth.server";
import {
	getConferenceSettings,
	updateConferenceSettings,
} from "@/features/settings/server/conference";
import { conferenceSettingsPatch } from "@/features/settings/validations";
import { defineTool, type McpTool } from "@/shared/server/mcp/define-tool";

const getConference = defineTool({
	name: "conference_get",
	title: "Get conference settings",
	description:
		"Read every conference setting: identity, important dates, locks, formats and programme defaults.",
	input: z.object({}),
	roles: ["ADMIN", "EDITOR"],
	scope: MCP_SCOPE_CONFERENCE_READ,
	readOnly: true,
	async handler() {
		return getConferenceSettings();
	},
});

const updateConference = defineTool({
	name: "conference_update",
	title: "Update conference settings",
	description:
		"Change conference settings. Send only the fields to change; everything omitted keeps its current value. Dates are YYYY-MM-DD, times HH:mm, timezone an IANA name.",
	input: conferenceSettingsPatch,
	roles: ["ADMIN"],
	scope: MCP_SCOPE_CONFERENCE_WRITE,
	destructive: true,
	async handler(input) {
		const current = await getConferenceSettings();
		const next = { ...current, ...input };
		await updateConferenceSettings(next);
		return next;
	},
});

export const settingsMcpTools: readonly McpTool[] = [
	getConference,
	updateConference,
];
