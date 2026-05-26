import type { Job, PgBoss } from "pg-boss";
import { prisma } from "@/db.server.ts";
import type { InputJsonValue } from "@/generated/prisma/internal/prismaNamespace.ts";
import { logger } from "@/logger.ts";
import { completeJob, failJob } from "../job-progress";
import { runAutoPlan } from "../planner/autoplan";

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
					data: proposal as unknown as InputJsonValue,
				},
			});

			await completeJob(jobId);
			logger.info(`[autoplan-worker] job ${jobId} done`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error(`[autoplan-worker] job ${jobId} failed:`, msg);
			await failJob(jobId, msg);
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
