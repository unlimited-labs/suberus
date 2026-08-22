import { createFileRoute } from "@tanstack/react-router";
import { acceptUpload } from "@/features/submissions/server/upload-target";
import { getUploadedFile } from "@/shared/server/form-upload";

export const Route = createFileRoute("/api/submissions/upload/$token")({
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
					await acceptUpload(params.token, file);
				} catch (error) {
					if (error instanceof Response) return error;
					throw error;
				}
				return new Response(null, { status: 204 });
			},
		},
	},
});
