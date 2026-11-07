import { parentPort, workerData } from "node:worker_threads";
import { printDocumentSchema } from "@/features/planner/print/print-document-schema";
import { renderDocx } from "@/features/planner/server/print-docx";

parentPort?.postMessage(
	await renderDocx(printDocumentSchema.parse(workerData)),
);
