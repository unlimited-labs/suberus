import { createFileRoute } from "@tanstack/react-router";
import { runOverdueCheck } from "@/jobs/check-overdue-assignments";

/**
 * API endpoint to trigger overdue assignment check
 *
 * Secured with CRON_SECRET environment variable.
 *
 * Usage:
 * POST /api/cron/check-overdue
 * Headers: Authorization: Bearer <CRON_SECRET>
 */
export const Route = createFileRoute("/api/cron/check-overdue")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				// Verify secret
				const authHeader = request.headers.get("Authorization");
				const cronSecret = process.env.CRON_SECRET;

				if (!cronSecret) {
					return new Response(
						JSON.stringify({ error: "CRON_SECRET not configured" }),
						{
							status: 500,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				const providedSecret = authHeader?.replace("Bearer ", "");
				if (providedSecret !== cronSecret) {
					return new Response(JSON.stringify({ error: "Unauthorized" }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				const result = await runOverdueCheck();

				return new Response(JSON.stringify(result), {
					status: result.success ? 200 : 500,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
