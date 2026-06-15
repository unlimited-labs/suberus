import type { PgBoss } from "pg-boss";
import { registerExtractionWorker } from "@/features/extraction/server/workers/extraction";
import { registerAutoplanWorker } from "@/features/planner/server/workers/autoplan";

// App-shell composition module: wires feature pg-boss workers to the shared queue.
export async function registerAllWorkers(boss: PgBoss): Promise<void> {
	await registerExtractionWorker(boss);
	await registerAutoplanWorker(boss);
}
