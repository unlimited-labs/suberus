import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import { authRequestMiddleware } from "@/features/auth/server/middleware";

export const Route = createFileRoute("/api/version")({
	server: {
		// Build info (commit/date) is only used by the in-app version-skew check;
		// gate it behind auth so it isn't an anonymous fingerprinting endpoint.
		middleware: [authRequestMiddleware],
		handlers: {
			GET: () =>
				Response.json({
					commit: env.GIT_COMMIT,
					builtAt: env.BUILD_DATE,
				}),
		},
	},
});
