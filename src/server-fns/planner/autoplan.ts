import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createJobProgress, getJobProgress } from "@/lib/server/job-progress";
import { adminMiddleware } from "@/lib/server/middleware/auth";
import { applyAutoPlan } from "@/lib/server/planner/autoplan";
import type { AutoPlanProposal } from "@/lib/server/planner/autoplan-types";
import { getBoss } from "@/lib/server/queue";
import { getSetting } from "@/lib/server/settings";

export const startAutoPlanFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.handler(async () => {
		const enabled = await getSetting("PLANNER_AUTOPLAN_ENABLED");
		if (!enabled) {
			throw new Error(
				"Autoplanner is disabled. Enable it in Configuration/Program/Planner.",
			);
		}
		const jobId = await createJobProgress("autoplan");
		const boss = await getBoss();
		await boss.send("autoplan", { jobId });
		return { jobId };
	});

export const getAutoPlanJobFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ jobId: z.uuid() }))
	.handler(async ({ data }) => {
		const job = await getJobProgress(data.jobId);
		if (!job) return { notFound: true as const };

		const proposalRow =
			job.status === "done"
				? await (
						await import("@/db.server")
					).prisma.autoplanProposal.findUnique({
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
	.inputValidator(z.object({ jobId: z.uuid() }))
	.handler(async ({ data }) => {
		return applyAutoPlan(data.jobId);
	});
