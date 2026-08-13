import { z } from "zod";
import {
	MCP_SCOPE_SUBMISSIONS_READ,
	MCP_SCOPE_SUBMISSIONS_WRITE,
} from "@/features/auth/server/auth.server";
import { getActiveSubmissionTypes } from "@/features/settings/server/settings";
import {
	getAdminSubmissions,
	getSubmissionForEditor,
} from "@/features/submissions/server/admin-submissions";
import { getConferenceTodo } from "@/features/submissions/server/conference-todo";
import {
	createSubmissionForUser,
	issueUploadLinkForDraft,
	submitDraftForUser,
} from "@/features/submissions/server/create-for-user";
import { getValidationLimits } from "@/features/submissions/server/create-submission";
import {
	adminSubmissionsListInput,
	submissionCreateForUserInput,
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

const conferenceTodo = defineTool({
	name: "conference_todo",
	title: "What blocks the conference",
	description:
		"Every submission waiting on somebody, grouped by what has to happen: blocking = the organizer's move (assign a reviewer, decide, chase an overdue review or an unpaid fee), waiting = the ball is with an author or reviewer. Start here when asked what to do next.",
	input: z.object({
		perGroup: z.number().int().min(1).max(100).default(20),
	}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_READ,
	readOnly: true,
	async handler(input) {
		return getConferenceTodo(input.perGroup);
	},
});

const requirements = defineTool({
	name: "submissions_requirements",
	title: "Submission requirements",
	description:
		"What each active submission type expects: whether it is written text or an uploaded file, which file extensions and size are allowed, and the title/abstract/keyword limits. Read this before drafting a submission.",
	input: z.object({}),
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_READ,
	readOnly: true,
	async handler() {
		const [types, limits] = await Promise.all([
			getActiveSubmissionTypes(),
			getValidationLimits(),
		]);
		return {
			limits,
			types: types.map(({ type, label, config }) => ({
				type,
				label,
				contentFormat: config.contentFormat,
				allowedExtensions: config.allowedExtensions,
				maxFileSizeMb: config.maxFileSizeMb,
				maxSubmissionsPerUser: config.maxSubmissionsPerUser,
				enableTrackSelection: config.enableTrackSelection,
			})),
		};
	},
});

const createForUser = defineTool({
	name: "submissions_create_for_user",
	title: "Create a submission for a participant",
	description:
		"Register a submission owned by a participant. A text type is complete at once (submit=true sends it straight into review). A file type is created as a draft and the result carries `upload.url`: POST the file there as multipart/form-data under the field name `file` — no authorization header, the URL is the credential, and it expires. Do that yourself when you can reach the file, or pass it to whoever holds it; the bytes must not travel through this conversation. Then call submissions_submit_draft. Deadlines and per-type limits are reported in `warnings`, not enforced.",
	input: submissionCreateForUserInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_WRITE,
	destructive: true,
	async handler(input, actor) {
		return createSubmissionForUser(input, actor.id);
	},
});

const uploadLink = defineTool({
	name: "submissions_upload_link",
	title: "New upload link",
	description:
		"Issue a fresh upload URL for a draft — after the old one expired, or when the wrong file was sent. Same contract as on create: multipart POST, field `file`. The new file replaces the old one.",
	input: submissionIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_WRITE,
	async handler(input) {
		return issueUploadLinkForDraft(input.submissionId);
	},
});

const submitDraftTool = defineTool({
	name: "submissions_submit_draft",
	title: "Submit a draft",
	description:
		"Send a draft into review on the author's behalf. A file type needs its file attached first.",
	input: submissionIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_WRITE,
	destructive: true,
	async handler(input, actor) {
		return submitDraftForUser(input.submissionId, actor.id);
	},
});

export const submissionsMcpTools: readonly McpTool[] = [
	listSubmissions,
	getSubmission,
	conferenceTodo,
	requirements,
	createForUser,
	uploadLink,
	submitDraftTool,
];
