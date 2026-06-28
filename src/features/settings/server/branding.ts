import { env } from "@/env";
import { SUPPORTED_IMAGE_EXTENSIONS } from "@/features/settings/file-types";
import { getSetting, setSetting } from "@/features/settings/server/settings";
import { logger } from "@/logger";
import {
	deleteFile,
	getFileDownloadUrl,
	uploadFile,
} from "@/shared/server/storage";
import { validateUpload } from "@/shared/server/validate-upload";

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

/**
 * Seal logo bytes for the signed-document stamp: the custom BRANDING_LOGO_URL,
 * or the built-in default mark when branding is default (matches BrandLogo's
 * on-screen fallback). Returns undefined on any fetch/size failure — a missing
 * logo must never fail signing. The docx-api rasterizes SVG to PNG.
 */
export async function getSealLogoBytes(): Promise<Buffer | undefined> {
	const configured = await getSetting("BRANDING_LOGO_URL");
	const raw = configured || "/logo.svg";
	const url = /^https?:\/\//i.test(raw)
		? raw
		: new URL(raw, env.APP_BASE_URL).toString();
	try {
		const res = await fetch(url);
		if (!res.ok) {
			logger.warn(`[seal-logo] fetch ${url} -> ${res.status}`);
			return undefined;
		}
		const buf = Buffer.from(await res.arrayBuffer());
		if (buf.length > MAX_IMAGE_BYTES) {
			logger.warn(`[seal-logo] ${url} exceeds size limit`);
			return undefined;
		}
		return buf;
	} catch (e) {
		logger.warn(`[seal-logo] fetch failed: ${String(e)}`);
		return undefined;
	}
}
