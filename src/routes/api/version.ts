import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";

export const Route = createFileRoute("/api/version")({
	server: {
		handlers: {
			GET: () =>
				Response.json({
					commit: env.GIT_COMMIT,
					builtAt: env.BUILD_DATE,
				}),
		},
	},
});
