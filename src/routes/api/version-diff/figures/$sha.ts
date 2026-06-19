import { createFileRoute } from "@tanstack/react-router";
import { authRequestMiddleware } from "@/features/auth/server/middleware";
import { figureKey } from "@/features/submission-diff/server/cas";
import { getFileContent } from "@/shared/server/storage";

const SHA_RE = /^[0-9a-f]{64}$/;

/**
 * Asset proxy for version-diff figures. The redline HTML references figures by
 * `figures/<sha>.png`; the render rewrites those to this route. Served as an
 * attachment (never a navigable document — C11) with an immutable cache, since
 * the sha is content-addressed. Auth-gated; the unguessable content sha is the
 * capability (finer per-submission authorization is a later hardening).
 */
export const Route = createFileRoute("/api/version-diff/figures/$sha")({
	server: {
		middleware: [authRequestMiddleware],
		handlers: {
			GET: async ({ params }) => {
				const { sha } = params;
				if (!SHA_RE.test(sha)) {
					return new Response("Invalid figure id", { status: 400 });
				}
				try {
					const result = await getFileContent(figureKey(sha));
					return new Response(result.body, {
						headers: {
							"Content-Type": "image/png",
							"Content-Disposition": "attachment",
							"Cache-Control": "private, max-age=31536000, immutable",
							...(result.contentLength && {
								"Content-Length": String(result.contentLength),
							}),
						},
					});
				} catch {
					return new Response("Figure not found", { status: 404 });
				}
			},
		},
	},
});
