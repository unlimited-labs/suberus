import { UploadValidationError } from "@/shared/server/validate-upload";

export const MAX_ATTACHMENT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CAMPAIGN_ATTACHMENTS_BYTES = 25 * 1024 * 1024;

/**
 * Guards the per-campaign attachment ceiling: `validateUpload` only bounds a
 * single file, so the running total of stored attachments is checked here.
 */
export function assertTotalWithinCap(
	existingBytes: number,
	newBytes: number,
): void {
	if (existingBytes + newBytes > MAX_CAMPAIGN_ATTACHMENTS_BYTES) {
		const maxMb = Math.round(MAX_CAMPAIGN_ATTACHMENTS_BYTES / (1024 * 1024));
		throw new UploadValidationError(
			`Attachments exceed the ${maxMb}MB total limit for one campaign.`,
		);
	}
}
