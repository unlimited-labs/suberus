import type { PgBoss } from "pg-boss";
import { registerExtractionWorker } from "@/features/extraction/server/workers/extraction";
import { registerAutoplanWorker } from "@/features/planner/server/workers/autoplan";

// App-server composition module: wires feature pg-boss workers to the shared
// queue. Lives in src/server (a composition root, NOT a boundary zone), so the
// feature worker imports stay out of shared/server/queue.ts. Called lazily from
// queue.ts's initBoss on first enqueue.
export async function registerAllWorkers(boss: PgBoss): Promise<void> {
	await registerExtractionWorker(boss);
	await registerAutoplanWorker(boss);
}
