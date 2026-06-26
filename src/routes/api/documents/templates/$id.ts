import { createFileRoute } from "@tanstack/react-router";
import { adminRequestMiddleware } from "@/features/auth/server/middleware";
import { prisma } from "@/shared/server/db.server";
import {
	contentDispositionAttachment,
	getFileContent,
} from "@/shared/server/storage";

const DOCX_MIME =
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Streams a template's original .docx (admin/editor only). */
export const Route = createFileRoute("/api/documents/templates/$id")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			GET: async ({ params }) => {
				const { id } = params;
				if (!uuidRegex.test(id)) {
					return new Response("Invalid template ID", { status: 400 });
				}

				const template = await prisma.documentTemplate.findUnique({
					where: { id },
					select: { storageKey: true, originalName: true },
				});
				if (!template?.storageKey) {
					return new Response("Not found", { status: 404 });
				}

				const result = await getFileContent(template.storageKey);
				return new Response(result.body, {
					headers: {
						"Content-Type": DOCX_MIME,
						"Content-Disposition": contentDispositionAttachment(
							template.originalName,
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
