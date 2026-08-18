import { env } from "@/env.ts";
import { SUPPORTED_FILE_EXTENSIONS } from "@/features/settings/file-types";
import { getSetting } from "@/features/settings/server/settings";
import { createJobProgress } from "@/shared/server/job-progress";
import { ensureQueueAndSend } from "@/shared/server/queue";
import { generateExtractionFileKey, uploadFile } from "@/shared/server/storage";
import { validateUpload } from "@/shared/server/validate-upload";

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
	// validateUpload stays first: a rejected upload must not leave a job row behind
	const detected = await validateUpload(buffer, {
		allowedExtensions: SUPPORTED_FILE_EXTENSIONS,
		maxBytes: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
	});

	const [heuristic, ai, jobId] = await Promise.all([
		getSetting("EXTRACTION_HEURISTIC"),
		getSetting("EXTRACTION_AI"),
		createJobProgress("extraction", createdById),
	]);
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
