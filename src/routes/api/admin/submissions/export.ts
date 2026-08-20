import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { adminRequestMiddleware } from "@/features/auth/server/middleware";
import {
	createSubmissionsZipStream,
	getSubmissionsForExport,
} from "@/features/submissions/server/export";
import { adminSubmissionsListInput } from "@/features/submissions/validations";

export const Route = createFileRoute("/api/admin/submissions/export")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const search = url.searchParams.get("search") ?? undefined;
				const typeParam = url.searchParams.get("type");
				const statusParam = url.searchParams.get("status");

				const filters = adminSubmissionsListInput.safeParse({
					search,
					type: typeParam?.split(","),
					status: statusParam?.split(","),
				});
				if (!filters.success) {
					return new Response("Invalid type or status filter", { status: 400 });
				}

				const submissions = await getSubmissionsForExport(filters.data);

				const archive = await createSubmissionsZipStream(submissions);
				// SAFETY: Node types toWeb as ReadableStream<any>; the archive emits bytes.
				const webStream = Readable.toWeb(archive) as ReadableStream<Uint8Array>;

				const filename = `submissions-export-${format(new Date(), "yyyy-MM-dd")}.zip`;

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
