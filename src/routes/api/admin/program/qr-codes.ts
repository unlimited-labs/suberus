import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { adminRequestMiddleware } from "@/features/auth/server/middleware";
import { createProgramQrZipStream } from "@/features/planner/server/qr-codes";
import { getSetting } from "@/features/settings/server/settings";

export const Route = createFileRoute("/api/admin/program/qr-codes")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			GET: async () => {
				const settings = await getSetting("PROGRAM_QR");
				const archive = await createProgramQrZipStream(settings);
				// SAFETY: Node types toWeb as ReadableStream<any>; the archive emits bytes.
				const webStream = Readable.toWeb(archive) as ReadableStream<Uint8Array>;

				const filename = `qr-codes-${format(new Date(), "yyyy-MM-dd")}.zip`;

				return new Response(webStream, {
					headers: {
						"Content-Type": "application/zip",
						"Content-Disposition": `attachment; filename="${filename}"`,
					},
				});
			},
		},
	},
});
