import type { Job, PgBoss } from "pg-boss";
import { runAutoPlan } from "@/features/planner/server/autoplan";
import type { InputJsonValue } from "@/generated/prisma/internal/prismaNamespace.ts";
import { logger } from "@/logger.ts";
import { clientSafeMessage } from "@/shared/errors/sanitize";
import { prisma } from "@/shared/server/db.server.ts";
import { completeJob, failJob } from "@/shared/server/job-progress";

export interface AutoplanJobData {
	jobId: string;
}

async function handleAutoplanJob(jobs: Job<AutoplanJobData>[]): Promise<void> {
	for (const job of jobs) {
		const { jobId } = job.data;
		try {
			const proposal = await runAutoPlan(jobId);

			await prisma.autoplanProposal.create({
				data: {
					jobId,
					// SAFETY: runAutoPlan returns a plain JSON-serialisable proposal.
					data: proposal as InputJsonValue,
				},
			});

			await completeJob(jobId);
			logger.info(`[autoplan-worker] job ${jobId} done`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error(`[autoplan-worker] job ${jobId} failed:`, msg);
			await failJob(jobId, clientSafeMessage(err));
			throw err;
		}
	}
}

export async function registerAutoplanWorker(boss: PgBoss): Promise<void> {
	await boss.work<AutoplanJobData>(
		"autoplan",
		{ localConcurrency: 1 },
		handleAutoplanJob,
	);
}
