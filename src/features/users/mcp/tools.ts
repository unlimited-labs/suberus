import {
	MCP_SCOPE_USERS_READ,
	MCP_SCOPE_USERS_WRITE,
} from "@/features/mcp/scopes";
import { createUserByAdmin } from "@/features/users/server/create-user";
import {
	adminUpdateProfile,
	getUserById,
	getUsers,
	markConfiguredFeePaid,
	patchUser,
} from "@/features/users/server/users";
import {
	feeMarkPaidInput,
	userCreateInput,
	userIdInput,
	userPatchInput,
	userProfileUpdateInput,
	usersListInput,
} from "@/features/users/validations";
import {
	ADMIN_AND_EDITOR,
	defineTool,
	type McpTool,
} from "@/shared/server/mcp/define-tool";

const listUsers = defineTool({
	name: "users_list",
	title: "List users",
	description:
		"List conference users with optional search, role and fee filters. Returns a trimmed row per user; use users_get for the full record.",
	input: usersListInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_USERS_READ,
	readOnly: true,
	async handler(input) {
		const { users, total } = await getUsers({ take: 50, ...input });
		return {
			total,
			returned: users.length,
			users: users.map((u) => ({
				id: u.id,
				email: u.email,
				firstName: u.firstName,
				lastName: u.lastName,
				affiliation: u.affiliation,
				role: u.role,
				isActive: u.isActive,
				emailVerified: u.emailVerified,
				feePaid: u.fee?.paid ?? false,
				createdAt: u.createdAt,
			})),
		};
	},
});

const getUser = defineTool({
	name: "users_get",
	title: "Get user",
	description:
		"Fetch one user by id, including submissions, survey answers and fee status.",
	input: userIdInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_USERS_READ,
	readOnly: true,
	async handler(input) {
		const user = await getUserById(input.id);
		if (!user) throw new Response("User not found", { status: 404 });
		return user;
	},
});

const createUser = defineTool({
	name: "users_create",
	title: "Create user",
	description:
		"Create a participant account. By default sends a set-password email; pass sendSetPasswordEmail=false to create the account silently.",
	input: userCreateInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_USERS_WRITE,
	async handler(input, actor) {
		return createUserByAdmin(input, actor.id);
	},
});

const updateUser = defineTool({
	name: "users_update",
	title: "Update user status",
	description:
		"Change role, active/late-submission flags, fee status or email verification. For name, email and billing details use users_update_profile.",
	input: userPatchInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_USERS_WRITE,
	destructive: true,
	async handler(input, actor) {
		return patchUser(input, actor);
	},
});

const updateUserProfile = defineTool({
	name: "users_update_profile",
	title: "Update user profile",
	description:
		"Replace a user's personal and billing details. Every field is overwritten, so send the full record.",
	input: userProfileUpdateInput,
	roles: ["ADMIN"],
	scope: MCP_SCOPE_USERS_WRITE,
	destructive: true,
	async handler(input) {
		const { id, ...profile } = input;
		return adminUpdateProfile(id, profile);
	},
});

const markFeePaidTool = defineTool({
	name: "users_mark_fee_paid",
	title: "Mark fee paid",
	description:
		"Record a participant's conference fee as paid. The amount and currency come from the configured fee types, so only the type is named — omit it when the conference has a single one. Use users_update with unmarkFeePaid to reverse it.",
	input: feeMarkPaidInput,
	roles: ADMIN_AND_EDITOR,
	scope: MCP_SCOPE_USERS_WRITE,
	async handler(input, actor) {
		return markConfiguredFeePaid(input, actor.id);
	},
});

export const usersMcpTools: readonly McpTool[] = [
	listUsers,
	getUser,
	createUser,
	updateUser,
	updateUserProfile,
	markFeePaidTool,
];
