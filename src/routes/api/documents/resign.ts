import { createFileRoute } from "@tanstack/react-router";
import { adminRequestMiddleware } from "@/features/auth/server/middleware";
import { resignSignedDocuments } from "@/features/documents/server/bulk";

/** Re-sign every previously-signed document with the conference's CURRENT
 * certificate. Used after a certificate rotation, since documents signed with
 * the replaced cert no longer match it on the public verifier. Admin/editor. */
export const Route = createFileRoute("/api/documents/resign")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			POST: async () => {
				const { count } = await resignSignedDocuments();
				return Response.json({ count });
			},
		},
	},
});
