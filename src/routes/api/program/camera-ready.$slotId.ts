import { createFileRoute } from "@tanstack/react-router";
import { isScheduleVisible } from "@/features/planner/server/schedule";
import { isUuid } from "@/shared/lib/uuid";
import { prisma } from "@/shared/server/db.server";
import { getFileContent, sanitizeFileName } from "@/shared/server/storage";

export const Route = createFileRoute("/api/program/camera-ready/$slotId")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { slotId } = params;
				if (!isUuid(slotId)) {
					return new Response("Invalid slot ID", { status: 400 });
				}
				if (!(await isScheduleVisible())) {
					return new Response("Not found", { status: 404 });
				}

				const slot = await prisma.presentationSlot.findUnique({
					where: { id: slotId },
					select: {
						submission: {
							select: {
								cameraReadyFile: {
									select: { storageKey: true, originalName: true },
								},
							},
						},
					},
				});
				const file = slot?.submission.cameraReadyFile;
				if (!file) {
					return new Response("Not found", { status: 404 });
				}

				const result = await getFileContent(file.storageKey);
				return new Response(result.body, {
					headers: {
						"Content-Type": "application/pdf",
						"Content-Disposition": `inline; filename="${sanitizeFileName(file.originalName)}"`,
						...(result.contentLength && {
							"Content-Length": String(result.contentLength),
						}),
					},
				});
			},
		},
	},
});
