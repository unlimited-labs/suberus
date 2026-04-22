import { createFileRoute } from "@tanstack/react-router";
import type { UserRole } from "@/generated/prisma/enums";
import { checkFileAccess } from "@/lib/server/files";
import { authRequestMiddleware } from "@/lib/server/middleware/auth";
import { getFileContent } from "@/lib/server/storage";

export const Route = createFileRoute("/api/files/$fileId")({
	server: {
		middleware: [authRequestMiddleware],
		handlers: {
			GET: async ({ params, context }) => {
				const { fileId } = params;

				// Validate UUID format
				const uuidRegex =
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
				if (!uuidRegex.test(fileId)) {
					return new Response("Invalid file ID", { status: 400 });
				}

				const { authorized, file } = await checkFileAccess(
					fileId,
					context.user.id,
					(context.user.role ?? "AUTHOR") as UserRole,
				);

				if (!authorized || !file) {
					return new Response("Forbidden", { status: 403 });
				}

				const result = await getFileContent(file.storageKey);

				return new Response(result.body, {
					headers: {
						"Content-Type": file.mimeType,
						"Content-Disposition": `attachment; filename="${file.originalName}"`,
						...(result.contentLength && {
							"Content-Length": String(result.contentLength),
						}),
					},
				});
			},
		},
	},
});
