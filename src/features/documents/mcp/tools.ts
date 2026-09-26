import { issueDocumentUploadLink } from "@/features/documents/server/upload-link";
import { uploadedDocumentMetaSchema } from "@/features/documents/validations";
import { MCP_SCOPE_USERS_WRITE } from "@/features/mcp/scopes";
import {
	ADMIN_AND_EDITOR,
	defineTool,
	type McpTool,
} from "@/shared/server/mcp/define-tool";

const uploadLink = defineTool({
	name: "documents_upload_link",
	title: "Document upload link",
	description:
		"Issue an upload URL for filing a ready PDF against a participant — an invoice, a certificate, anything produced outside the system. POST the file to it as multipart/form-data under the field name `file`; the bytes must never travel through this conversation. The document appears under the participant's documents with `title` as its name, is signed with the conference certificate per `signMode` (VISIBLE = signature + seal drawn on the first page, INVISIBLE = signature without a seal, NONE = unsigned; default VISIBLE), and e-mails the participant unless `notify` is false. The link lasts one hour and files one document per POST.",
	input: uploadedDocumentMetaSchema,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_USERS_WRITE,
	async handler(input, actor) {
		return issueDocumentUploadLink({ ...input, by: actor.id });
	},
});

export const documentsMcpTools: readonly McpTool[] = [uploadLink];
