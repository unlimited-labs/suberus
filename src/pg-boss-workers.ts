import type { PgBoss } from "pg-boss";
import { registerExtractionWorker } from "@/features/extraction/server/workers/extraction";
import { registerAutoplanWorker } from "@/features/planner/server/workers/autoplan";

// App-shell composition module: wires feature pg-boss workers to the shared
// queue. Lives at the src/ root (the app-shell/composition tier, NOT a boundary
// zone and NOT the nitro src/server/ dir), so the feature worker imports stay out
// of shared/server/queue.ts. Server-only - dynamically imported lazily from
// queue.ts's initBoss on first enqueue.
export async function registerAllWorkers(boss: PgBoss): Promise<void> {
	await registerExtractionWorker(boss);
	await registerAutoplanWorker(boss);
}
