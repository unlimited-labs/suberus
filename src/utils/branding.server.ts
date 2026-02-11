import {
	deleteFile,
	getFileDownloadUrl,
	uploadFile,
} from "@/lib/server/storage";
import { getSetting, setSetting } from "./settings.server";

const MIME_TO_EXT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

/**
 * Upload auth background image to S3.
 * Deletes old image if one exists, then saves new S3 key to settings.
 */
export async function uploadAuthBackground(
	buffer: Buffer,
	mimeType: string,
): Promise<string> {
	// Delete old image if present
	const oldKey = await getSetting("BRANDING_AUTH_BACKGROUND_KEY");
	if (oldKey) {
		await deleteFile(oldKey);
	}

	const ext = MIME_TO_EXT[mimeType] ?? "png";
	const key = `branding/auth-background/${Date.now()}.${ext}`;

	await uploadFile(buffer, key, mimeType);
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
