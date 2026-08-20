import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	type BrandingSettings,
	brandingSettingsQueryOptions,
	deleteAuthBackgroundFn,
	deleteBrandingFaviconFn,
	deleteBrandingLogoFn,
	updateBrandingSettingsFn,
	uploadAuthBackgroundFn,
	uploadBrandingFaviconFn,
	uploadBrandingLogoFn,
} from "@/features/settings/api/settings";
import { getErrorMessage } from "@/shared/lib/error-message";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BG_SIZE_MB = 5;
const MAX_BG_SIZE_BYTES = MAX_BG_SIZE_MB * 1024 * 1024;

function isValidImageFile(file: File | undefined): file is File {
	if (!file) return false;
	if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
		toast.error("Invalid file type. Use JPG, PNG, or WebP.");
		return false;
	}
	if (file.size > MAX_BG_SIZE_BYTES) {
		toast.error(`File size exceeds ${MAX_BG_SIZE_MB}MB limit.`);
		return false;
	}
	return true;
}

type UploadFn = (opts: { data: FormData }) => Promise<{ url: string }>;
type DeleteFn = () => Promise<{ success: boolean }>;

/** Upload/remove handling for a single branding image (logo, favicon, auth bg). */
function useImageUpload(
	label: string,
	uploadFn: UploadFn,
	deleteFn: DeleteFn,
	onUrl: (url: string) => void,
	/** Called after a successful upload/remove so the app-wide logo/favicon refreshes. */
	onChanged: () => Promise<void>,
) {
	const [uploading, setUploading] = useState(false);
	const [removing, setRemoving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!isValidImageFile(file)) return;

		setUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const { url } = await uploadFn({ data: formData });
			onUrl(url);
			await onChanged();
			toast.success(`${label} uploaded`);
		} catch {
			toast.error(`Failed to upload ${label.toLowerCase()}`);
		}
		setUploading(false);
		if (inputRef.current) inputRef.current.value = "";
	};

	const onRemove = async () => {
		setRemoving(true);
		try {
			await deleteFn();
			onUrl("");
			await onChanged();
			toast.success(`${label} removed`);
		} catch {
			toast.error(`Failed to remove ${label.toLowerCase()}`);
		}
		setRemoving(false);
	};

	return { uploading, removing, inputRef, onUpload, onRemove };
}

export function useBrandingSettings(initialData: BrandingSettings) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);

	const handleChange = <K extends keyof BrandingSettings>(
		field: K,
		value: BrandingSettings[K],
	) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const setField = (field: keyof BrandingSettings) => (url: string) =>
		setData((prev) => ({ ...prev, [field]: url }));

	// Re-run loaders + branding query so the app-wide logo/favicon reflects changes.
	const refresh = async () => {
		await queryClient.invalidateQueries({
			queryKey: brandingSettingsQueryOptions().queryKey,
		});
		await router.invalidate();
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateBrandingSettingsFn({ data });
			await refresh();
			toast.success("Branding settings saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save branding settings"));
		}
		setIsSaving(false);
	};

	const bg = useImageUpload(
		"Background image",
		uploadAuthBackgroundFn,
		deleteAuthBackgroundFn,
		setField("authBackgroundUrl"),
		refresh,
	);
	const logo = useImageUpload(
		"Logo",
		uploadBrandingLogoFn,
		deleteBrandingLogoFn,
		setField("logoUploadUrl"),
		refresh,
	);
	const favicon = useImageUpload(
		"Favicon",
		uploadBrandingFaviconFn,
		deleteBrandingFaviconFn,
		setField("faviconUploadUrl"),
		refresh,
	);

	return { data, isSaving, handleChange, handleSave, bg, logo, favicon };
}

export type BrandingSettingsHandleChange = <K extends keyof BrandingSettings>(
	field: K,
	value: BrandingSettings[K],
) => void;

export type ImageUpload = ReturnType<typeof useImageUpload>;
