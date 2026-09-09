import { createFileRoute } from "@tanstack/react-router";
import { isScheduleVisible } from "@/features/planner/server/schedule";
import { isFileContentFormat } from "@/features/settings/server/settings";
import { cameraReadyFileResponse } from "@/features/submissions/server/camera-ready";
import { isUuid } from "@/shared/lib/uuid";
import { prisma } from "@/shared/server/db.server";

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
								type: true,
								cameraReadyFile: {
									select: { storageKey: true, originalName: true },
								},
							},
						},
					},
				});

				if (!slot || !(await isFileContentFormat(slot.submission.type))) {
					return new Response("Not found", { status: 404 });
				}

				return cameraReadyFileResponse(slot.submission.cameraReadyFile);
			},
		},
	},
});
