import { createFileRoute } from "@tanstack/react-router";
import { resolveDownload } from "@/features/submissions/server/download-link";
import {
	contentDispositionAttachment,
	getFileContent,
} from "@/shared/server/storage";

export const Route = createFileRoute("/api/submissions/download/$token")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				try {
					const file = await resolveDownload(params.token);
					const result = await getFileContent(file.storageKey);

					return new Response(result.body, {
						headers: {
							"Content-Type": file.mimeType,
							// The URL is the credential here, so no shared cache may keep
							// the file around after the token expires.
							"Cache-Control": "private, no-store",
							"Content-Disposition": contentDispositionAttachment(
								file.originalName,
							),
							...(result.contentLength && {
								"Content-Length": String(result.contentLength),
							}),
						},
					});
				} catch (error) {
					if (error instanceof Response) return error;
					throw error;
				}
			},
		},
	},
});
