import { createFileRoute } from "@tanstack/react-router";
import { isScheduleVisible } from "@/features/planner/server/schedule";
import { cameraReadyFileResponse } from "@/features/submissions/server/camera-ready";
import { prisma } from "@/shared/server/db.server";

const notFound = () => new Response("Not found", { status: 404 });

export const Route = createFileRoute("/s/$n")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const match = /^(\d{1,9})(?:\.pdf)?$/i.exec(params.n);
				if (!match) return notFound();
				if (!(await isScheduleVisible())) return notFound();

				const submission = await prisma.submission.findUnique({
					where: { sequentialNumber: Number(match[1]) },
					select: {
						presentationSlot: { select: { id: true } },
						cameraReadyFile: {
							select: { storageKey: true, originalName: true },
						},
					},
				});
				if (!submission?.presentationSlot) return notFound();

				return cameraReadyFileResponse(submission.cameraReadyFile);
			},
		},
	},
});
