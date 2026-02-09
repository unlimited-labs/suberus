import { createFileRoute } from "@tanstack/react-router";
import type { UserRole } from "@/generated/prisma/enums";
import { getFileDownloadUrl } from "@/lib/server/storage";
import { authRequestMiddleware } from "@/utils/auth.middleware";
import { checkFileAccess } from "@/utils/files.server";

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

				// Generate pre-signed download URL and redirect
				const downloadUrl = await getFileDownloadUrl(file.storageKey);

				return new Response(null, {
					status: 302,
					headers: {
						Location: downloadUrl,
					},
				});
			},
		},
	},
});
