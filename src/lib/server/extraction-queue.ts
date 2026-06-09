import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/settings/file-types";
import { createJobProgress } from "./job-progress";
import { ensureQueueAndSend } from "./queue";
import { getSetting } from "./settings";
import { generateExtractionFileKey, uploadFile } from "./storage";
import { validateUpload } from "./validate-upload";

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
	createdById?: string,
): Promise<{ jobId: string }> {
	const maxFileSizeMb = await getSetting("MAX_FILE_SIZE_MB");
	const detected = await validateUpload(buffer, {
		allowedExtensions: SUPPORTED_FILE_EXTENSIONS,
		maxBytes: maxFileSizeMb * 1024 * 1024,
	});

	const [heuristic, ai] = await Promise.all([
		getSetting("EXTRACTION_HEURISTIC"),
		getSetting("EXTRACTION_AI"),
	]);

	const jobId = await createJobProgress("extraction", createdById);
	const storageKey = generateExtractionFileKey(jobId, fileName);
	await uploadFile(buffer, storageKey, detected.mime);

	await ensureQueueAndSend("extraction", {
		jobId,
		storageKey,
		fileName,
		fileExt: detected.ext,
		heuristic,
		ai,
	});

	return { jobId };
}
