import { parentPort, workerData } from "node:worker_threads";
import {
	type PrintRenderJob,
	renderJob,
} from "@/features/planner/server/print-render-job";

// SAFETY: workerData is the PrintRenderJob posted by renderOffThread in the same build.
const bytes = await renderJob(workerData as PrintRenderJob);
const out = new Uint8Array(bytes).buffer;
parentPort?.postMessage(out, [out]);
