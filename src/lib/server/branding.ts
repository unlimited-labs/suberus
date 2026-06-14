import { getSetting, setSetting } from "@/lib/server/settings";
import { validateUpload } from "@/lib/server/validate-upload";
import { SUPPORTED_IMAGE_EXTENSIONS } from "@/lib/settings/file-types";
import {
	deleteFile,
	getFileDownloadUrl,
	uploadFile,
} from "@/shared/server/storage";

/** Branding/avatar images are capped at 5MB (matches the upload UI). */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Upload auth background image to S3.
 * Deletes old image if one exists, then saves new S3 key to settings.
 */
export async function uploadAuthBackground(buffer: Buffer): Promise<string> {
	const detected = await validateUpload(buffer, {
		allowedExtensions: SUPPORTED_IMAGE_EXTENSIONS,
		maxBytes: MAX_IMAGE_BYTES,
	});

	// Delete old image if present
	const oldKey = await getSetting("BRANDING_AUTH_BACKGROUND_KEY");
	if (oldKey) {
		await deleteFile(oldKey);
	}

	const key = `branding/auth-background/${Date.now()}.${detected.ext}`;

	await uploadFile(buffer, key, detected.mime);
	await setSetting("BRANDING_AUTH_BACKGROUND_KEY", key);

	return key;
}

/**
 * Delete auth background image from S3 and clear the setting.
 */
export async function deleteAuthBackground(): Promise<void> {
	const key = await getSetting("BRANDING_AUTH_BACKGROUND_KEY");
	if (key) {
		await deleteFile(key);
	}
	await setSetting("BRANDING_AUTH_BACKGROUND_KEY", "");
}

/**
 * Get presigned URL for auth background image.
 * Returns empty string if no background is set.
 */
export async function getAuthBackgroundUrl(): Promise<string> {
	const key = await getSetting("BRANDING_AUTH_BACKGROUND_KEY");
	if (!key) return "";
	return getFileDownloadUrl(key);
}
