import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";
import type {
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import {
	createSubmissionsZipStream,
	getSubmissionsForExport,
} from "@/lib/server/admin/submissions-export";
import { adminRequestMiddleware } from "@/lib/server/middleware/auth";

export const Route = createFileRoute("/api/admin/submissions/export")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const search = url.searchParams.get("search") ?? undefined;
				const typeParam = url.searchParams.get("type");
				const statusParam = url.searchParams.get("status");

				const type = typeParam
					? (typeParam.split(",") as SubmissionType[])
					: undefined;
				const status = statusParam
					? (statusParam.split(",") as SubmissionStatus[])
					: undefined;

				const submissions = await getSubmissionsForExport({
					search,
					type,
					status,
				});

				const archive = await createSubmissionsZipStream(submissions);
				const webStream = Readable.toWeb(archive) as ReadableStream<Uint8Array>;

				const filename = `submissions-export-${new Date().toISOString().split("T")[0]}.zip`;

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
