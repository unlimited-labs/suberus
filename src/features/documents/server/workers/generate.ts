import type { Job, PgBoss } from "pg-boss";
import {
	DOCUMENT_GENERATE_QUEUE,
	processDocumentGeneration,
} from "@/features/documents/server/generate";
import { logger } from "@/logger";
import { prisma } from "@/shared/server/db.server";

interface DocumentGenerateJobData {
	documentId: string;
}

async function handleDocumentGenerateJob(
	jobs: Job<DocumentGenerateJobData>[],
): Promise<void> {
	for (const job of jobs) {
		const { documentId } = job.data;
		try {
			await processDocumentGeneration(documentId);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.error(`[document-generate] job ${documentId} failed:`, msg);
			await prisma.generatedDocument
				.update({
					where: { id: documentId },
					data: { status: "FAILED", error: msg.slice(0, 1000) },
				})
				.catch(() => {});
			// Rethrow so pg-boss retries transient failures (sidecar blip). A
			// permanent failure exhausts retries and the row stays FAILED — the
			// operator regenerates explicitly.
			throw err;
		}
	}
}

export async function registerDocumentGenerateWorker(
	boss: PgBoss,
): Promise<void> {
	// LibreOffice is effectively single-threaded per host; keep concurrency low.
	await boss.work<DocumentGenerateJobData>(
		DOCUMENT_GENERATE_QUEUE,
		{ localConcurrency: 1 },
		handleDocumentGenerateJob,
	);
}
