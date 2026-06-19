import type { PgBoss } from "pg-boss";
import { registerBulkEmailWorker } from "@/features/bulk-email/server/workers/bulk-email";
import { registerExtractionWorker } from "@/features/extraction/server/workers/extraction";
import { registerAutoplanWorker } from "@/features/planner/server/workers/autoplan";
import { registerSubmissionDiffWorker } from "@/features/submission-diff/server/workers/normalize";

// App-shell composition module: wires feature pg-boss workers to the shared queue.
export async function registerAllWorkers(boss: PgBoss): Promise<void> {
	await registerExtractionWorker(boss);
	await registerAutoplanWorker(boss);
	await registerBulkEmailWorker(boss);
	await registerSubmissionDiffWorker(boss);
}
