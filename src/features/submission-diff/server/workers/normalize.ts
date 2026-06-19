import type { Job, PgBoss } from "pg-boss";
import { logger } from "@/logger.ts";
import { diffAgainstPrevious } from "../diff-version";
import {
	type NormalizeInput,
	normalizeSubmissionFile,
} from "../normalize-version";

const SUBMISSION_DIFF_QUEUE = "submission-diff";

type SubmissionDiffJobData = NormalizeInput;

async function handleSubmissionDiff(
	jobs: Job<SubmissionDiffJobData>[],
): Promise<void> {
	for (const job of jobs) {
		try {
			const result = await normalizeSubmissionFile(job.data);
			logger.info(
				`[submission-diff] ${job.id}: artifact ${result.artifactId} cached=${result.cached} figures=${result.figures}`,
			);
			if (job.data.versionId) {
				const diff = await diffAgainstPrevious(
					job.data.versionId,
					result.htmlKey,
				);
				if (diff) {
					logger.info(
						`[submission-diff] ${job.id}: redline ${diff.diffArtifactId} +${diff.insertions} -${diff.deletions}`,
					);
				}
			}
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
