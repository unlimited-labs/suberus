import { Worker } from "node:worker_threads";
import type { PrintRenderJob } from "./print-render-job";

declare global {
	// Nitro's server entry sets this; its own public-asset reader resolves the server dir from it.
	var __nitro_main__: string | undefined;
}

const RENDER_TIMEOUT_MS = 120_000;

function workerEntry(): URL {
	const main = globalThis.__nitro_main__;
	if (!main) throw new Error("Nitro server entry is not set");
	return new URL("./print-render-worker.mjs", main);
}

// Docx TOC estimation and large workbooks are seconds of sync CPU; off the request loop in prod.
export async function renderOffThread(job: PrintRenderJob): Promise<Buffer> {
	if (import.meta.env.DEV) {
		const { renderJob } = await import("./print-render-job");
		return renderJob(job);
	}
	return new Promise((resolve, reject) => {
		const worker = new Worker(workerEntry(), { workerData: job });
		const timer = setTimeout(() => {
			reject(new Error("Generating the file took too long"));
			void worker.terminate();
		}, RENDER_TIMEOUT_MS);
		const settle = () => clearTimeout(timer);
		worker.once("message", (bytes: ArrayBuffer) => {
			settle();
			resolve(Buffer.from(bytes));
		});
		worker.once("error", (error) => {
			settle();
			reject(error);
		});
		worker.once("exit", (code) => {
			settle();
			if (code !== 0)
				reject(new Error(`print-render worker exited with ${code}`));
		});
	});
}
