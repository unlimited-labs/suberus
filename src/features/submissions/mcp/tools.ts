import { z } from "zod";
import {
	MCP_SCOPE_SUBMISSIONS_READ,
	MCP_SCOPE_SUBMISSIONS_WRITE,
} from "@/features/mcp/scopes";
import { getActiveSubmissionTypes } from "@/features/settings/server/settings";
import {
	changeSubmissionSubmitter,
	getAdminSubmissions,
	getSubmissionForEditor,
	updateSubmissionForAdmin,
} from "@/features/submissions/server/admin-submissions";
import { getConferenceTodo } from "@/features/submissions/server/conference-todo";
import {
	createSubmissionForUser,
	issueUploadLinkForDraft,
	submitDraftForUser,
} from "@/features/submissions/server/create-for-user";
import { getValidationLimits } from "@/features/submissions/server/create-submission";
import { issueDownloadLink } from "@/features/submissions/server/download-link";
import {
	adminSubmissionsListInput,
	submissionChangeSubmitterInput,
	submissionCreateForUserInput,
	submissionIdInput,
	submissionUpdateInput,
} from "@/features/submissions/validations";
import {
	deskAcceptSubmission,
	exhibitorGuard,
} from "@/features/workflow/server/workflow";
import { deskDecisionInput } from "@/features/workflow/validations";
import {
	ADMIN_AND_EDITOR,
	defineTool,
	type McpTool,
} from "@/shared/server/mcp/define-tool";

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

const deskAccept = defineTool({
	name: "submissions_desk_accept",
	title: "Desk accept a submission",
	description:
		"Accept a submission without review. Records an ACCEPT decision with `reason` as the letter to the author and e-mails the presenting author immediately — there is no undo. Exhibitor entries are refused; they go through the exhibitor approval flow.",
	input: deskDecisionInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_WRITE,
	destructive: true,
	async handler(input, actor) {
		if (!(await getSubmissionForEditor(input.submissionId))) {
			throw new Response("Submission not found", { status: 404 });
		}
		const blocked = await exhibitorGuard(input.submissionId);
		if (blocked) return blocked;
		return deskAcceptSubmission(input.submissionId, actor.id, input.reason);
	},
});

const updateSubmission = defineTool({
	name: "submissions_update",
	title: "Correct a submission",
	description:
		"Fix a submission in place — title, abstract, authors, keywords or track. Only the fields you send change; everything else is left as it is. Edits the current version rather than adding one, and the status is untouched. Use submissions_download_link first when the point is to check what the uploaded document actually says.",
	input: submissionUpdateInput,
	roles: ["ADMIN"],
	scope: MCP_SCOPE_SUBMISSIONS_WRITE,
	destructive: true,
	async handler({ submissionId, ...patch }, actor) {
		return updateSubmissionForAdmin(submissionId, actor.id, patch);
	},
});

const changeSubmitter = defineTool({
	name: "submissions_change_submitter",
	title: "Change a submission's submitter",
	description:
		"Move a submission to a different user account. The submitter owns the record — they see it in their submissions, upload revisions and receive its reminders — which is a separate thing from the author list; correct authors with submissions_update. Exhibitor and invited placeholders are refused. `userId` is the account that takes over; find it with users_list.",
	input: submissionChangeSubmitterInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_WRITE,
	destructive: true,
	async handler({ submissionId, userId }, actor) {
		return changeSubmissionSubmitter(submissionId, actor.id, userId);
	},
});

const downloadLink = defineTool({
	name: "submissions_download_link",
	title: "Download link",
	description:
		"Issue a short-lived address for the file on a submission's current version. The address needs no sign-in, works only for that one file and expires in 15 minutes; ask again for a fresh one. Text submissions have no file — read their abstract with submissions_get.",
	input: submissionIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_SUBMISSIONS_READ,
	readOnly: true,
	async handler(input) {
		return issueDownloadLink(input.submissionId);
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
	deskAccept,
	updateSubmission,
	changeSubmitter,
	downloadLink,
];
