import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/features/settings/server/settings";

/**
 * Web app manifest, generated so the installed PWA carries the conference's own
 * name and colours. Served uncached: renaming the conference takes effect at once.
 */
export const Route = createFileRoute("/api/manifest")({
	server: {
		handlers: {
			GET: async () => {
				const s = await getSettings([
					"CONFERENCE_NAME",
					"CONFERENCE_SUBTITLE",
					"BRANDING_PRIMARY_COLOR",
				]);
				const name = s.CONFERENCE_NAME || "Programme";
				const color = s.BRANDING_PRIMARY_COLOR || "#ffffff";

				return Response.json(
					{
						id: "/program",
						name,
						short_name: name,
						description: s.CONFERENCE_SUBTITLE || undefined,
						start_url: "/program",
						scope: "/",
						display: "standalone",
						theme_color: color,
						background_color: color,
						icons: [
							{
								src: "/web-app-manifest-192x192.png",
								sizes: "192x192",
								type: "image/png",
								purpose: "maskable",
							},
							{
								src: "/web-app-manifest-512x512.png",
								sizes: "512x512",
								type: "image/png",
								purpose: "maskable",
							},
						],
					},
					{
						headers: {
							"Content-Type": "application/manifest+json",
							"Cache-Control": "no-cache",
						},
					},
				);
			},
		},
	},
});
