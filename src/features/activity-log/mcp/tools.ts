import { listActivity } from "@/features/activity-log/server/query";
import { activityLogListInput } from "@/features/activity-log/validations";
import { MCP_SCOPE_ACTIVITY_READ } from "@/features/mcp/scopes";
import {
	ADMIN_AND_EDITOR,
	defineTool,
	type McpTool,
} from "@/shared/server/mcp/define-tool";

const listActivityLog = defineTool({
	name: "activity_list",
	title: "Search the activity log",
	description:
		"Read the audit trail, newest first. Filter by event type, the user or submission it concerns, who performed it, and a time range (ISO 8601). Returns at most `take` entries; pass the last id back as `cursor` for the next page.",
	input: activityLogListInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_ACTIVITY_READ,
	readOnly: true,
	async handler(input) {
		const { entries, nextCursor } = await listActivity(input);
		return { returned: entries.length, nextCursor, entries };
	},
});

export const activityLogMcpTools: readonly McpTool[] = [listActivityLog];
