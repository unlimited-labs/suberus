import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/features/auth/server/middleware";
import { applyAutoPlan } from "@/features/planner/server/autoplan";
import type { AutoPlanProposal } from "@/features/planner/server/autoplan-types";
import { getSetting } from "@/features/settings/server/settings";
import { prisma } from "@/shared/server/db.server.ts";
import {
	createJobProgress,
	getJobProgress,
} from "@/shared/server/job-progress";
import { ensureQueueAndSend } from "@/shared/server/queue";

export const startAutoPlanFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.handler(async ({ context }) => {
		const enabled = await getSetting("PLANNER_AUTOPLAN_ENABLED");
		if (!enabled) {
			throw new Error(
				"Autoplanner is disabled. Enable it in Configuration/Program/Planner.",
			);
		}
		const jobId = await createJobProgress("autoplan", context.user.id);
		await ensureQueueAndSend("autoplan", { jobId });
		return { jobId };
	});

export const getAutoPlanJobFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.object({ jobId: z.uuid() }))
	.handler(async ({ data }) => {
		const job = await getJobProgress(data.jobId);
		if (!job) return { notFound: true as const };

		const proposalRow =
			job.status === "done"
				? await prisma.autoplanProposal.findUnique({
						where: { jobId: data.jobId },
					})
				: null;

		return {
			notFound: false as const,
			id: job.id,
			status: job.status,
			progress: { stage: job.stage, current: job.current, total: job.total },
			proposal: (proposalRow?.data ?? null) as AutoPlanProposal | null,
			error: job.error,
			appliedAt: proposalRow?.appliedAt?.toISOString() ?? null,
		};
	});

export const applyAutoPlanFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ jobId: z.uuid() }))
	.handler(async ({ data }) => {
		return applyAutoPlan(data.jobId);
	});
