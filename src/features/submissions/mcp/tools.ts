import { MCP_SCOPE_SUBMISSIONS_READ } from "@/features/auth/server/auth.server";
import {
	getAdminSubmissions,
	getSubmissionForEditor,
} from "@/features/submissions/server/admin-submissions";
import {
	adminSubmissionsListInput,
	submissionIdInput,
} from "@/features/submissions/validations";
import { defineTool, type McpTool } from "@/shared/server/mcp/define-tool";

const ADMIN_AND_EDITOR = ["ADMIN", "EDITOR"] as const;

const listSubmissions = defineTool({
	name: "submissions_list",
	title: "List submissions",
	description:
		"List submissions with optional search, type and status filters. Returns a row per submission with the presenting author, review progress and the next action due; use submissions_get for the full record.",
	input: adminSubmissionsListInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_READ,
	readOnly: true,
	async handler(input) {
		const { submissions, total } = await getAdminSubmissions({
			take: 50,
			...input,
		});
		return { total, returned: submissions.length, submissions };
	},
});

const getSubmission = defineTool({
	name: "submissions_get",
	title: "Get submission",
	description:
		"Fetch one submission in full: content, authors and their affiliations, every version with its keywords, reviewer assignments, submitted reviews and the activity history.",
	input: submissionIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_READ,
	readOnly: true,
	async handler(input) {
		const submission = await getSubmissionForEditor(input.submissionId);
		if (!submission)
			throw new Response("Submission not found", { status: 404 });
		return submission;
	},
});

export const submissionsMcpTools: readonly McpTool[] = [
	listSubmissions,
	getSubmission,
];
