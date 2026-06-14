import type { Job, PgBoss } from "pg-boss";
import {
	type ExtractionConfig,
	type ExtractionResult,
	extractFromDocx,
	extractFromPdf,
} from "@/features/extraction/server/extraction";
import { completeJob, failJob, setJobStage } from "@/lib/server/job-progress";
import { logger } from "@/logger.ts";
import { deleteFile, getFileBuffer } from "@/shared/server/storage";

export interface ExtractionJobData {
	jobId: string;
	storageKey: string;
	fileName: string;
	/** Extension detected by magic-number validation at enqueue time. */
	fileExt: string;
	heuristic: boolean;
	ai: boolean;
}

async function handleExtraction(jobs: Job<ExtractionJobData>[]): Promise<void> {
	for (const job of jobs) {
		await processExtractionJob(job);
	}
}

async function processExtractionJob(
	job: Job<ExtractionJobData>,
): Promise<ExtractionResult> {
	const { jobId, storageKey, fileName, fileExt, heuristic, ai } = job.data;
	// Route on the validated content type, not the (forgeable) file name.
	// Fall back to the name for jobs enqueued before fileExt was added.
	const isDocx = fileExt
		? fileExt === "docx"
		: fileName.toLowerCase().endsWith(".docx");
	const config: ExtractionConfig = { heuristic, ai };
	const reportStage = (stage: string, total: number) =>
		setJobStage(jobId, stage, total);

	try {
		await setJobStage(jobId, "downloading", 1);
		const buffer = await getFileBuffer(storageKey);

		const result = isDocx
			? await extractFromDocx(buffer, config, fileName, reportStage)
			: await extractFromPdf(buffer, fileName, config, reportStage);

		await completeJob(jobId, result as object);
		await deleteFile(storageKey).catch((err) => {
			logger.error("[extraction-worker] failed to delete staged file:", err);
		});
		return result;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown extraction error";
		logger.error(`[extraction-worker] ${jobId}: ${message}`);
		await failJob(jobId, message);
		throw error;
	}
}

export async function registerExtractionWorker(boss: PgBoss): Promise<void> {
	await boss.work<ExtractionJobData>(
		"extraction",
		{ localConcurrency: 2 },
		handleExtraction,
	);
}
