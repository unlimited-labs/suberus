import { createFileRoute } from "@tanstack/react-router";
import { adminRequestMiddleware } from "@/features/auth/server/middleware";
import { getPublicCertPem } from "@/features/settings/server/document-signing";

/** Streams the public signing certificate (.cer, no private key) so verifiers
 * can import it as a trusted identity. Admin/editor only. */
export const Route = createFileRoute("/api/documents/signing-cert")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			GET: async () => {
				const pem = await getPublicCertPem();
				if (!pem)
					return new Response("No certificate configured", { status: 404 });
				return new Response(pem, {
					headers: {
						"Content-Type": "application/x-x509-ca-cert",
						"Content-Disposition":
							'attachment; filename="signing-certificate.cer"',
					},
				});
			},
		},
	},
});
