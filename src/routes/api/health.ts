import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/shared/server/db.server";

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => {
				try {
					await prisma.$queryRaw`SELECT 1`;
					return Response.json({ status: "ok" });
				} catch {
					return Response.json(
						{ status: "error", db: "down" },
						{ status: 503 },
					);
				}
			},
		},
	},
});
