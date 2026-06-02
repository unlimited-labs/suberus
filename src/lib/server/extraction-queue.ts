import { createJobProgress } from "./job-progress";
import { ensureQueueAndSend } from "./queue";
import { getSetting } from "./settings";
import { generateExtractionFileKey, uploadFile } from "./storage";

/**
 * Stage a file in object storage and enqueue an extraction job.
 *
 * Settings are snapshotted at enqueue time so settings changes mid-extraction
 * don't affect in-flight jobs. Throws if the file exceeds the configured max
 * size.
 */
export async function enqueueExtractionJob(
	buffer: Buffer,
	fileName: string,
): Promise<{ jobId: string }> {
	const maxFileSizeMb = await getSetting("MAX_FILE_SIZE_MB");
	const maxBytes = maxFileSizeMb * 1024 * 1024;
	if (buffer.length > maxBytes) {
		throw new Error(`File exceeds max size of ${maxFileSizeMb} MB`);
	}

	const [heuristic, ai] = await Promise.all([
		getSetting("EXTRACTION_HEURISTIC"),
		getSetting("EXTRACTION_AI"),
	]);

	const jobId = await createJobProgress("extraction");
	const storageKey = generateExtractionFileKey(jobId, fileName);
	await uploadFile(buffer, storageKey, "application/octet-stream");

	await ensureQueueAndSend("extraction", {
		jobId,
		storageKey,
		fileName,
		heuristic,
		ai,
	});

	return { jobId };
}
