import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import type { PrintRenderJob } from "./print-render-job";

// Built by Nitro next to index.mjs (vite.config.ts build:config hook); SSR chunks live in _ssr/.
const workerEntry = () =>
	join(
		dirname(fileURLToPath(import.meta.url)),
		"..",
		"print-render-worker.mjs",
	);

// Docx TOC estimation and large workbooks are seconds of sync CPU; off the request loop in prod.
export async function renderOffThread(job: PrintRenderJob): Promise<Buffer> {
	if (import.meta.env.DEV) {
		const { renderJob } = await import("./print-render-job");
		return renderJob(job);
	}
	return new Promise((resolve, reject) => {
		const worker = new Worker(workerEntry(), { workerData: job });
		worker.once("message", (bytes: ArrayBuffer) => resolve(Buffer.from(bytes)));
		worker.once("error", reject);
		worker.once("exit", (code) => {
			if (code !== 0)
				reject(new Error(`print-render worker exited with ${code}`));
		});
	});
}
