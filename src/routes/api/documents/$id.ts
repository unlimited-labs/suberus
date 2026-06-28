import { createFileRoute } from "@tanstack/react-router";
import { authRequestMiddleware } from "@/features/auth/server/middleware";
import { isUuid } from "@/shared/lib/uuid";
import { prisma } from "@/shared/server/db.server";
import {
	contentDispositionAttachment,
	getFileContent,
} from "@/shared/server/storage";

const ADMIN_ROLES = ["ADMIN", "EDITOR"];

/**
 * Streams a generated document (PDF) through the app — same model as
 * `/api/files/$fileId`, so the object store never needs to be browser-reachable
 * and access stays behind app auth. Participants may fetch only their own READY
 * documents; admins/editors may fetch any.
 */
export const Route = createFileRoute("/api/documents/$id")({
	server: {
		middleware: [authRequestMiddleware],
		handlers: {
			GET: async ({ params, context }) => {
				const { id } = params;
				if (!isUuid(id)) {
					return new Response("Invalid document ID", { status: 400 });
				}

				const doc = await prisma.generatedDocument.findUnique({
					where: { id },
					select: { userId: true, status: true, storageKey: true, name: true },
				});
				if (!doc) return new Response("Not found", { status: 404 });

				const isAdmin =
					!!context.user.role && ADMIN_ROLES.includes(context.user.role);
				if (!isAdmin && doc.userId !== context.user.id) {
					return new Response("Forbidden", { status: 403 });
				}
				if (doc.status !== "READY" || !doc.storageKey) {
					return new Response("Document is not ready", { status: 409 });
				}

				const result = await getFileContent(doc.storageKey);
				return new Response(result.body, {
					headers: {
						"Content-Type": "application/pdf",
						"Content-Disposition": contentDispositionAttachment(
							`${doc.name}.pdf`,
						),
						...(result.contentLength && {
							"Content-Length": String(result.contentLength),
						}),
					},
				});
			},
		},
	},
});
