import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/features/auth/server/auth.server";
import { syncDesktopClientScopes } from "@/features/mcp/server/connection";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				if (url.pathname.endsWith("/oauth2/authorize")) {
					const clientId = url.searchParams.get("client_id");
					if (clientId) await syncDesktopClientScopes(clientId);
				}
				return await auth.handler(request);
			},
			POST: async ({ request }) => await auth.handler(request),
		},
	},
});
