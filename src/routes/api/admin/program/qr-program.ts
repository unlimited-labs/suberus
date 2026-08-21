import { createFileRoute } from "@tanstack/react-router";
import { adminRequestMiddleware } from "@/features/auth/server/middleware";
import { programQrUrl, renderQr } from "@/features/planner/server/qr-codes";
import { getSetting } from "@/features/settings/server/settings";

export const Route = createFileRoute("/api/admin/program/qr-program")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			GET: async () => {
				const settings = await getSetting("PROGRAM_QR");
				const qr = await renderQr(programQrUrl(settings.baseUrl), settings);

				return new Response(qr.body, {
					headers: {
						"Content-Type": qr.contentType,
						"Content-Disposition": `attachment; filename="program-qr.${settings.format}"`,
					},
				});
			},
		},
	},
});
