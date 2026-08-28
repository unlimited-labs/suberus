import { createFileRoute } from "@tanstack/react-router";
import { authRequestMiddleware } from "@/features/auth/server/middleware";
import type { UserRole } from "@/generated/prisma/enums";
import { isUuid } from "@/shared/lib/uuid";
import { contentDispositionAttachment } from "@/shared/server/file-names";
import { checkFileAccess } from "@/shared/server/files";
import { getFileContent } from "@/shared/server/storage";

export const Route = createFileRoute("/api/files/$fileId")({
	server: {
		middleware: [authRequestMiddleware],
		handlers: {
			GET: async ({ params, context }) => {
				const { fileId } = params;

				if (!isUuid(fileId)) {
					return new Response("Invalid file ID", { status: 400 });
				}

				const { authorized, file } = await checkFileAccess(
					fileId,
					context.user.id,
					// SAFETY: session role mirrors the DB enum column.
					(context.user.role ?? "AUTHOR") as UserRole,
				);

				if (!authorized || !file) {
					return new Response("Forbidden", { status: 403 });
				}

				const result = await getFileContent(file.storageKey);

				return new Response(result.body, {
					headers: {
						"Content-Type": file.mimeType,
						"Content-Disposition": contentDispositionAttachment(
							file.originalName,
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
