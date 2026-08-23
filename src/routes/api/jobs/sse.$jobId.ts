import { createFileRoute } from "@tanstack/react-router";
import { authRequestMiddleware } from "@/features/auth/server/middleware";
import { prisma } from "@/shared/server/db.server.ts";

export const Route = createFileRoute("/api/jobs/sse/$jobId")({
	server: {
		middleware: [authRequestMiddleware],
		handlers: {
			GET: async ({ params, context }) => {
				const { jobId } = params;

				// Ownership check: only the user who created the job (or an
				// editor/admin) may stream its progress. Prevents enumerating
				// other users' job status/errors.
				const owned = await prisma.jobProgress.findUnique({
					where: { id: jobId },
					select: { createdById: true },
				});
				const isStaff =
					context.user.role === "ADMIN" || context.user.role === "EDITOR";
				if (owned && !isStaff && owned.createdById !== context.user.id) {
					return new Response("Forbidden", { status: 403 });
				}

				const encoder = new TextEncoder();

				const stream = new ReadableStream({
					start(controller) {
						// oxlint-disable-next-line prefer-const -- cleanup() closes over it before setInterval assigns it
						let intervalId: ReturnType<typeof setInterval>;

						const cleanup = () => {
							clearInterval(intervalId);
						};

						intervalId = setInterval(async () => {
							try {
								const job = await prisma.jobProgress.findUnique({
									where: { id: jobId },
								});

								if (!job) {
									const errorEvent = `event: error\ndata: ${JSON.stringify({ error: "Job not found" })}\n\n`;
									controller.enqueue(encoder.encode(errorEvent));
									cleanup();
									controller.close();
									return;
								}

								const payload = JSON.stringify({
									status: job.status,
									stage: job.stage,
									current: job.current,
									total: job.total,
									error: job.error ?? null,
								});

								controller.enqueue(encoder.encode(`data: ${payload}\n\n`));

								if (job.status === "done" || job.status === "error") {
									cleanup();
									controller.close();
								}
							} catch {
								const errorEvent = `event: error\ndata: ${JSON.stringify({ error: "Internal server error" })}\n\n`;
								try {
									controller.enqueue(encoder.encode(errorEvent));
									controller.close();
								} catch {
									// controller already closed
								}
								cleanup();
							}
						}, 500);
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			},
		},
	},
});
