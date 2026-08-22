import { SUPPORTED_IMAGE_EXTENSIONS } from "@/features/settings/file-types";
import { getSetting, setSetting } from "@/features/settings/server/settings";
import {
	deleteFile,
	getFileContent,
	uploadFile,
} from "@/shared/server/storage";
import { validateUpload } from "@/shared/server/validate-upload";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const BRANDING_IMAGES = {
	logo: { settingKey: "BRANDING_LOGO_KEY", pathPrefix: "branding/logo" },
	favicon: {
		settingKey: "BRANDING_FAVICON_KEY",
		pathPrefix: "branding/favicon",
	},
	"auth-background": {
		settingKey: "BRANDING_AUTH_BACKGROUND_KEY",
		pathPrefix: "branding/auth-background",
	},
} as const;

export type BrandingImageName = keyof typeof BRANDING_IMAGES;

export function isBrandingImageName(name: string): name is BrandingImageName {
	return name in BRANDING_IMAGES;
}

async function uploadBrandingImage(
	buffer: Buffer,
	name: BrandingImageName,
): Promise<void> {
	const { settingKey, pathPrefix } = BRANDING_IMAGES[name];
	const detected = await validateUpload(buffer, {
		allowedExtensions: SUPPORTED_IMAGE_EXTENSIONS,
		maxBytes: MAX_IMAGE_BYTES,
	});

	const oldKey = await getSetting(settingKey);
	if (oldKey) {
		await deleteFile(oldKey);
	}

	const key = `${pathPrefix}/${Date.now()}.${detected.ext}`;
	await uploadFile(buffer, key, detected.mime);
	await setSetting(settingKey, key);
}

async function deleteBrandingImage(name: BrandingImageName): Promise<void> {
	const { settingKey } = BRANDING_IMAGES[name];
	const key = await getSetting(settingKey);
	if (key) {
		await deleteFile(key);
	}
	await setSetting(settingKey, "");
}

async function getBrandingImageUrl(name: BrandingImageName): Promise<string> {
	const key = await getSetting(BRANDING_IMAGES[name].settingKey);
	if (!key) return "";
	// Cache-buster = the upload timestamp from the key (so a replaced image busts
	// caches). Avoid `?v=` — Vite's dev server reserves it for module versioning.
	const version = key.split("/").pop()?.split(".")[0] ?? "1";
	return `/api/branding/${name}?rev=${version}`;
}

export async function getBrandingImageContent(name: BrandingImageName) {
	const key = await getSetting(BRANDING_IMAGES[name].settingKey);
	if (!key) return null;
	return getFileContent(key);
}

export const uploadAuthBackground = (buffer: Buffer) =>
	uploadBrandingImage(buffer, "auth-background");
export const deleteAuthBackground = () =>
	deleteBrandingImage("auth-background");
export const getAuthBackgroundUrl = () =>
	getBrandingImageUrl("auth-background");

export const uploadBrandingLogo = (buffer: Buffer) =>
	uploadBrandingImage(buffer, "logo");
export const deleteBrandingLogo = () => deleteBrandingImage("logo");
export const getBrandingLogoUrl = () => getBrandingImageUrl("logo");

export const uploadBrandingFavicon = (buffer: Buffer) =>
	uploadBrandingImage(buffer, "favicon");
export const deleteBrandingFavicon = () => deleteBrandingImage("favicon");
export const getBrandingFaviconUrl = () => getBrandingImageUrl("favicon");
