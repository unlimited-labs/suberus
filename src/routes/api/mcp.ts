import { requireMcpAuth } from "@better-auth/mcp";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import { activityLogMcpTools } from "@/features/activity-log/mcp/tools";
import { auth, MCP_RESOURCE } from "@/features/auth/server/auth.server";
import { hasAdminRole } from "@/features/auth/server/middleware";
import { bulkEmailMcpTools } from "@/features/bulk-email/mcp/tools";
import { MCP_CAPABILITY_SCOPES } from "@/features/mcp/scopes";
import { plannerMcpTools } from "@/features/planner/mcp/tools";
import { settingsMcpTools } from "@/features/settings/mcp/tools";
import { submissionsMcpTools } from "@/features/submissions/mcp/tools";
import { usersMcpTools } from "@/features/users/mcp/tools";
import { prisma } from "@/shared/server/db.server";
import { createSuberusMcpHandler } from "@/shared/server/mcp/server";

const baseUrl = new URL(env.APP_BASE_URL);

const handler = createSuberusMcpHandler({
	name: "suberus",
	version: env.GIT_COMMIT,
	tools: [
		...usersMcpTools,
		...settingsMcpTools,
		...submissionsMcpTools,
		...activityLogMcpTools,
		...plannerMcpTools,
		...bulkEmailMcpTools,
	],
	allowedHostnames: [baseUrl.hostname],
});

async function serve(request: Request): Promise<Response> {
	if (!env.MCP_ENABLED) {
		return new Response("MCP server is disabled", { status: 404 });
	}

	// Without an explicit resource this falls back to the auth base URL, giving
	// an unreachable metadata URL and the wrong audience.
	return requireMcpAuth(
		auth,
		async (req, claims) => {
			const user = claims.sub
				? await prisma.user.findUnique({
						where: { id: claims.sub },
						select: {
							id: true,
							role: true,
							email: true,
							isActive: true,
						},
					})
				: null;

			if (!user?.isActive || !hasAdminRole(user.role)) {
				return new Response("Forbidden", { status: 403 });
			}

			// Space-delimited grant (RFC 9068).
			const scopes =
				typeof claims.scope === "string"
					? claims.scope.split(" ").filter(Boolean)
					: [];
			return handler(req, {
				id: user.id,
				role: user.role,
				email: user.email,
				scopes,
			});
		},
		{
			resource: MCP_RESOURCE,
			// Advertised, not required: a token short of a scope must still reach the
			// tool, which answers with the challenge naming what it needs.
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
