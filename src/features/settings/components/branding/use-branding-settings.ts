import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	type BrandingSettings,
	brandingSettingsQueryOptions,
	deleteAuthBackgroundFn,
	updateBrandingSettingsFn,
	uploadAuthBackgroundFn,
} from "@/features/settings/api/settings";
import { getErrorMessage } from "@/shared/lib/error-message";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BG_SIZE_MB = 5;
const MAX_BG_SIZE_BYTES = MAX_BG_SIZE_MB * 1024 * 1024;

function isValidBgFile(file: File | undefined): file is File {
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

export function useBrandingSettings(initialData: BrandingSettings) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);
	const [bgUploading, setBgUploading] = useState(false);
	const [bgRemoving, setBgRemoving] = useState(false);
	const bgInputRef = useRef<HTMLInputElement>(null);

	const handleChange = <K extends keyof BrandingSettings>(
		field: K,
		value: BrandingSettings[K],
	) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateBrandingSettingsFn({ data });
			await queryClient.invalidateQueries({
				queryKey: brandingSettingsQueryOptions().queryKey,
			});
			await router.invalidate();
			toast.success("Branding settings saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save branding settings"));
		} finally {
			setIsSaving(false);
		}
	};

	const resetBgInput = () => {
		if (bgInputRef.current) bgInputRef.current.value = "";
	};

	const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!isValidBgFile(file)) return;

		setBgUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", file);

			const { url } = await uploadAuthBackgroundFn({ data: formData });
			setData((prev) => ({ ...prev, authBackgroundUrl: url }));
			toast.success("Background image uploaded");
		} catch {
			toast.error("Failed to upload background image");
		} finally {
			setBgUploading(false);
			resetBgInput();
		}
	};

	const handleBgRemove = async () => {
		setBgRemoving(true);
		try {
			await deleteAuthBackgroundFn();
			setData((prev) => ({ ...prev, authBackgroundUrl: "" }));
			toast.success("Background image removed");
		} catch {
			toast.error("Failed to remove background image");
		} finally {
			setBgRemoving(false);
		}
	};

	return {
		data,
		isSaving,
		bgUploading,
		bgRemoving,
		bgInputRef,
		handleChange,
		handleSave,
		handleBgUpload,
		handleBgRemove,
	};
}

export type BrandingSettingsHandleChange = <K extends keyof BrandingSettings>(
	field: K,
	value: BrandingSettings[K],
) => void;
