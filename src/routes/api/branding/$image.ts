import { createFileRoute } from "@tanstack/react-router";
import {
	getBrandingImageContent,
	isBrandingImageName,
} from "@/features/settings/server/branding";

/**
 * Streams a branding image (logo / favicon / auth-background) through the app.
 * Public: these appear on login pages, the app shell, and the browser tab.
 * The `?v=` cache-buster (the S3 key) lets us cache immutably yet refresh on replace.
 */
export const Route = createFileRoute("/api/branding/$image")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { image } = params;
				if (!isBrandingImageName(image)) {
					return new Response("Not found", { status: 404 });
				}

				const result = await getBrandingImageContent(image);
				if (!result) {
					return new Response("Not found", { status: 404 });
				}

				return new Response(result.body, {
					headers: {
						"Content-Type": result.contentType,
						"Cache-Control": "public, max-age=31536000, immutable",
						...(result.contentLength && {
							"Content-Length": String(result.contentLength),
						}),
					},
				});
			},
		},
	},
});
