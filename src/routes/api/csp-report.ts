import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/logger";
import { allowRequest } from "@/shared/server/rate-limit";

const MAX_REPORT_BYTES = 16_384;

export const Route = createFileRoute("/api/csp-report")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const size = Number(
					request.headers.get("content-length") ?? Number.NaN,
				);
				if (!(size <= MAX_REPORT_BYTES)) {
					return new Response(null, { status: 413 });
				}
				if (allowRequest("csp-report", 30, 60_000)) {
					const body = await request.text();
					logger.warn("CSP violation:", JSON.stringify(body.slice(0, 2000)));
				}
				return new Response(null, { status: 204 });
			},
		},
	},
});
