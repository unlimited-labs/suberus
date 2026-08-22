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
import {
	type BrandingFormValues,
	brandingSchema,
} from "@/features/settings/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
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

function useImageUpload(
	label: string,
	uploadFn: UploadFn,
	deleteFn: DeleteFn,
	onUrl: (url: string) => void,
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
	const [images, setImages] = useState({
		logoUploadUrl: initialData.logoUploadUrl,
		faviconUploadUrl: initialData.faviconUploadUrl,
		authBackgroundUrl: initialData.authBackgroundUrl,
	});

	const refresh = async () => {
		await queryClient.invalidateQueries({
			queryKey: brandingSettingsQueryOptions().queryKey,
		});
		await router.invalidate();
	};

	const form = useAppForm({
		defaultValues: {
			logoUrl: initialData.logoUrl,
			faviconUrl: initialData.faviconUrl,
			primaryColor: initialData.primaryColor,
			secondaryColor: initialData.secondaryColor,
			footerText: initialData.footerText,
			authBgOverlay: initialData.authBgOverlay,
			logoDarkInvert: initialData.logoDarkInvert,
		} satisfies BrandingFormValues,
		validators: { onChange: brandingSchema, onSubmit: brandingSchema },
		onSubmit: async ({ value }) => {
			try {
				await updateBrandingSettingsFn({ data: value });
				await refresh();
				toast.success("Branding settings saved");
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save branding settings"));
			}
		},
	});

	const setImage = (field: keyof typeof images) => (url: string) =>
		setImages((prev) => ({ ...prev, [field]: url }));

	const bg = useImageUpload(
		"Background image",
		uploadAuthBackgroundFn,
		deleteAuthBackgroundFn,
		setImage("authBackgroundUrl"),
		refresh,
	);
	const logo = useImageUpload(
		"Logo",
		uploadBrandingLogoFn,
		deleteBrandingLogoFn,
		setImage("logoUploadUrl"),
		refresh,
	);
	const favicon = useImageUpload(
		"Favicon",
		uploadBrandingFaviconFn,
		deleteBrandingFaviconFn,
		setImage("faviconUploadUrl"),
		refresh,
	);

	return { form, images, bg, logo, favicon };
}

export type BrandingFormApi = ReturnType<typeof useBrandingSettings>["form"];

export type BrandingImages = ReturnType<typeof useBrandingSettings>["images"];

export type ImageUpload = ReturnType<typeof useImageUpload>;
