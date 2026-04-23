import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/lib/server/middleware/auth";
import { applyAutoPlan, startAutoPlan } from "@/lib/server/planner/autoplan";
import { getJob } from "@/lib/server/planner/autoplan-queue";

export const startAutoPlanFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.handler(async () => {
		const jobId = await startAutoPlan();
		return { jobId };
	});

export const getAutoPlanJobFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ jobId: z.uuid() }))
	.handler(async ({ data }) => {
		const job = getJob(data.jobId);
		if (!job) return { notFound: true as const };
		return {
			notFound: false as const,
			id: job.id,
			status: job.status,
			progress: job.progress,
			proposal: job.proposal,
			error: job.error,
			appliedAt: job.appliedAt?.toISOString() ?? null,
		};
	});

export const applyAutoPlanFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ jobId: z.uuid() }))
	.handler(async ({ data }) => {
		return applyAutoPlan(data.jobId);
	});
