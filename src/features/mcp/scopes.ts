/**
 * Capability scopes reach `scopes_supported` (identity ones are filtered out),
 * which is where clients read what to request. Missing one doesn't hide its
 * tool — the call answers insufficient_scope; see shared/server/mcp/server.ts.
 *
 * Leaf module on purpose: tool registries and the consent screen name a scope
 * without pulling auth.server.ts (and with it betterAuth + PrismaClient).
 */
export const MCP_SCOPE_USERS_READ = "users:read";
export const MCP_SCOPE_USERS_WRITE = "users:write";
export const MCP_SCOPE_CONFERENCE_READ = "conference:read";
export const MCP_SCOPE_CONFERENCE_WRITE = "conference:write";
export const MCP_SCOPE_SUBMISSIONS_READ = "submissions:read";
export const MCP_SCOPE_SUBMISSIONS_WRITE = "submissions:write";
export const MCP_SCOPE_ACTIVITY_READ = "activity:read";

export const MCP_CAPABILITY_SCOPES = [
	MCP_SCOPE_USERS_READ,
	MCP_SCOPE_USERS_WRITE,
	MCP_SCOPE_CONFERENCE_READ,
	MCP_SCOPE_CONFERENCE_WRITE,
	MCP_SCOPE_SUBMISSIONS_READ,
	MCP_SCOPE_SUBMISSIONS_WRITE,
	MCP_SCOPE_ACTIVITY_READ,
] as const;

export const MCP_SCOPES = [
	"openid",
	"profile",
	"email",
	"offline_access",
	...MCP_CAPABILITY_SCOPES,
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];
