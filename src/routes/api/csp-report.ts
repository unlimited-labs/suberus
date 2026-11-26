import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/logger";
import { allowRequest } from "@/shared/server/rate-limit";

export const Route = createFileRoute("/api/csp-report")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (allowRequest("csp-report", 30, 60_000)) {
					const body = await request.text();
					logger.warn("CSP violation:", body.slice(0, 2000));
				}
				return new Response(null, { status: 204 });
			},
		},
	},
});
