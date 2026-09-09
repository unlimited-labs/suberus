import { createFileRoute } from "@tanstack/react-router";
import { attachUploadedDocument } from "@/features/documents/server/upload";
import { readDocumentUploadToken } from "@/features/documents/server/upload-link";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";
import { UploadValidationError } from "@/shared/server/validate-upload";

export const Route = createFileRoute("/api/documents/upload/$token")({
	server: {
		handlers: {
			POST: async ({ params, request }) => {
				let file: File;
				try {
					file = getUploadedFile(await request.formData());
				} catch {
					return new Response(
						"Send the file as multipart/form-data under the field name 'file'",
						{ status: 400 },
					);
				}

				try {
					const { by, ...meta } = readDocumentUploadToken(params.token);
					await attachUploadedDocument({
						...meta,
						buffer: await fileToBuffer(file),
						createdById: by,
					});
				} catch (error) {
					if (error instanceof Response) return error;
					if (error instanceof UploadValidationError) {
						return new Response(error.message, { status: 400 });
					}
					throw error;
				}
				return new Response(null, { status: 204 });
			},
		},
	},
});
