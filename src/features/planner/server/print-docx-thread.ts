import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import type { PrintDocument } from "@/features/planner/print/print-document-schema";
import { renderDocx } from "./print-docx";

// Built by Nitro next to index.mjs (vite.config.ts build:config hook); SSR chunks live in _ssr/.
const workerEntry = () =>
	join(dirname(fileURLToPath(import.meta.url)), "..", "print-docx-worker.mjs");

// TOC page estimation is seconds of sync CPU for big programs; off the request loop in prod.
export function renderDocxOffThread(doc: PrintDocument): Promise<Buffer> {
	if (import.meta.env.DEV) return renderDocx(doc);
	return new Promise((resolve, reject) => {
		const worker = new Worker(workerEntry(), { workerData: doc });
		worker.once("message", (bytes: Uint8Array) => resolve(Buffer.from(bytes)));
		worker.once("error", reject);
		worker.once("exit", (code) => {
			if (code !== 0)
				reject(new Error(`print-docx worker exited with ${code}`));
		});
	});
}
