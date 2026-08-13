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
					// Names the field: a caller that guessed wrong can fix it from the
					// response instead of retrying blind.
					return new Response(
						"Send the file as multipart/form-data under the field name 'file'",
						{ status: 400 },
					);
				}

				const result = await acceptUpload(params.token, file);
				return result.ok
					? new Response(null, { status: 204 })
					: new Response(result.error, { status: result.status });
			},
		},
	},
});
