import type { Job, PgBoss } from "pg-boss";
import { logger } from "@/logger.ts";
import type { NormalizeInput } from "../normalize-version";

const SUBMISSION_DIFF_QUEUE = "submission-diff";

type SubmissionDiffJobData = NormalizeInput;

async function handleSubmissionDiff(
	jobs: Job<SubmissionDiffJobData>[],
): Promise<void> {
	// Load the normalize pipeline lazily: it pulls in jsdom (+ LibreOffice/docx
	// machinery) which must never enter the worker-registration import path —
	// registration runs at pg-boss init for ALL queues, and a heavy/bundle-hostile
	// import there (jsdom reads default-stylesheet.css at load) crashes init and
	// kills every queue. The heavy code is only needed once a job actually runs.
	const { normalizeSubmissionFile } = await import("../normalize-version");
	for (const job of jobs) {
		try {
			const result = await normalizeSubmissionFile(job.data);
			logger.info(
				`[submission-diff] ${job.id}: artifact ${result.artifactId} cached=${result.cached} figures=${result.figures}`,
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unknown normalize error";
			logger.error(`[submission-diff] ${job.id}: ${message}`);
			throw error;
		}
	}
}

export async function registerSubmissionDiffWorker(
	boss: PgBoss,
): Promise<void> {
	// localConcurrency 1: LibreOffice rasterization in docx-api serializes (C5),
	// so there is no gain from concurrent normalize jobs per instance.
	await boss.work<SubmissionDiffJobData>(
		SUBMISSION_DIFF_QUEUE,
		{ localConcurrency: 1 },
		handleSubmissionDiff,
	);
}
