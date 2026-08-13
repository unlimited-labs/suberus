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
					return new Response("A file is required", { status: 400 });
				}

				const result = await acceptUpload(params.token, file);
				return result.ok
					? new Response(null, { status: 204 })
					: new Response(result.error, { status: result.status });
			},
		},
	},
});
