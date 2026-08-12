import { requireMcpAuth } from "@better-auth/mcp";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import {
	auth,
	MCP_RESOURCE,
	MCP_SCOPE_USERS_READ,
	MCP_SCOPE_USERS_WRITE,
} from "@/features/auth/server/auth.server";
import { hasAdminRole } from "@/features/auth/server/middleware";
import { usersMcpTools } from "@/features/users/mcp/tools";
import { prisma } from "@/shared/server/db.server";
import { createSuberusMcpHandler } from "@/shared/server/mcp/server";

const baseUrl = new URL(env.APP_BASE_URL);

const handler = createSuberusMcpHandler({
	name: "suberus",
	version: env.GIT_COMMIT,
	tools: usersMcpTools,
	allowedHostnames: [baseUrl.hostname],
	allowedOrigins: [baseUrl.origin],
});

async function serve(request: Request): Promise<Response> {
	if (!env.MCP_ENABLED) {
		return new Response("MCP server is disabled", { status: 404 });
	}

	// Without an explicit resource this falls back to the auth base URL, which
	// both advertises an unreachable metadata URL in the 401 challenge and
	// validates the token audience against the wrong identifier.
	return requireMcpAuth(
		auth,
		async (req, claims) => {
			const user = claims.sub
				? await prisma.user.findUnique({
						where: { id: claims.sub },
						select: { id: true, role: true, isActive: true },
					})
				: null;

			if (!user?.isActive || !hasAdminRole(user.role)) {
				return new Response("Forbidden", { status: 403 });
			}

			return handler(req, { id: user.id, role: user.role });
		},
		{
			resource: MCP_RESOURCE,
			// Advertised, not required: this is the third place a client may read
			// the scope set from (after the resource metadata and the AS metadata).
			// requiredScopes stays unset until a real client is seen asking for them.
			challengeScopes: [MCP_SCOPE_USERS_READ, MCP_SCOPE_USERS_WRITE],
		},
	)(request);
}

export const Route = createFileRoute("/api/mcp")({
	server: {
		handlers: {
			GET: ({ request }) => serve(request),
			POST: ({ request }) => serve(request),
			DELETE: ({ request }) => serve(request),
		},
	},
});
