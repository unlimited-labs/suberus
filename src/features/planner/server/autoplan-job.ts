import { getSetting } from "@/features/settings/server/settings";
import { prisma } from "@/shared/server/db.server";
import {
	createJobProgress,
	getJobProgress,
} from "@/shared/server/job-progress";
import { ensureQueueAndSend } from "@/shared/server/queue";
import type { AutoPlanProposal } from "./autoplan-types";

export async function startAutoPlan(
	userId: string,
): Promise<{ jobId: string }> {
	const enabled = await getSetting("PLANNER_AUTOPLAN_ENABLED");
	if (!enabled) {
		throw new Error(
			"Autoplanner is disabled. Enable it in Settings/Program/Planner.",
		);
	}
	const jobId = await createJobProgress("autoplan", userId);
	await ensureQueueAndSend("autoplan", { jobId });
	return { jobId };
}

export async function getAutoPlanJob(jobId: string) {
	const job = await getJobProgress(jobId);
	if (!job) return { notFound: true as const };

	const proposalRow =
		job.status === "done"
			? await prisma.autoplanProposal.findUnique({ where: { jobId } })
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
}
