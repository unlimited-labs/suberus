import { ensureQueueAndSend } from "@/shared/server/queue";
import type { NormalizeInput } from "./normalize-version";

// Kept in its own module (NOT the worker module): the worker is imported by the
// pg-boss composition root, which is dynamically imported by the shared queue —
// so a worker that also imported the queue would form an init cycle.
const SUBMISSION_DIFF_QUEUE = "submission-diff";

/** Enqueue an ETAP1 normalize job for one submission version's DOCX file. */
export async function enqueueVersionNormalize(
	input: NormalizeInput,
): Promise<string | null> {
	// expireInSeconds lets pg-boss reclaim a handler that hung past the sidecar
	// timeout (defence-in-depth with the AbortSignal in http.ts) and retry it.
	return ensureQueueAndSend(SUBMISSION_DIFF_QUEUE, input, {
		retryLimit: 2,
		expireInSeconds: 300,
	});
}
