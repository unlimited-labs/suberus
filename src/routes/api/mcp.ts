import { requireMcpAuth } from "@better-auth/mcp";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import {
	auth,
	MCP_CAPABILITY_SCOPES,
	MCP_RESOURCE,
} from "@/features/auth/server/auth.server";
import { hasAdminRole } from "@/features/auth/server/middleware";
import { settingsMcpTools } from "@/features/settings/mcp/tools";
import { submissionsMcpTools } from "@/features/submissions/mcp/tools";
import { usersMcpTools } from "@/features/users/mcp/tools";
import { prisma } from "@/shared/server/db.server";
import { createSuberusMcpHandler } from "@/shared/server/mcp/server";

const baseUrl = new URL(env.APP_BASE_URL);

const handler = createSuberusMcpHandler({
	name: "suberus",
	version: env.GIT_COMMIT,
	tools: [...usersMcpTools, ...settingsMcpTools, ...submissionsMcpTools],
	allowedHostnames: [baseUrl.hostname],
	allowedOriginHostnames: [baseUrl.hostname],
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

			// claims.scope is the space-delimited grant (RFC 9068).
			const scopes =
				typeof claims.scope === "string" ? claims.scope.split(" ") : [];
			return handler(req, { id: user.id, role: user.role, scopes });
		},
		{
			resource: MCP_RESOURCE,
			// Advertised on the 401, not required to reach the endpoint: a token
			// short of a scope must still get in far enough for the tool it called
			// to answer a challenge naming what that one tool needs.
			challengeScopes: [...MCP_CAPABILITY_SCOPES],
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
