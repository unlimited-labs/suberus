import type { StandardSchemaV1 } from "@tanstack/react-form";
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
	brandingColorsSchema,
	brandingFooterSchema,
	brandingLogoSchema,
	brandingOverlaySchema,
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

function useBrandingSave() {
	const queryClient = useQueryClient();
	const router = useRouter();

	const refresh = async () => {
		await queryClient.invalidateQueries({
			queryKey: brandingSettingsQueryOptions().queryKey,
		});
		await router.invalidate();
	};

	const save = async (patch: Partial<BrandingFormValues>) => {
		try {
			await updateBrandingSettingsFn({ data: patch });
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save branding settings"));
			return;
		}
		await refresh();
		toast.success("Branding settings saved");
	};

	return { refresh, save };
}

function useSectionForm<T extends Partial<BrandingFormValues>>(
	defaultValues: T,
	schema: StandardSchemaV1<T>,
	save: (patch: T) => Promise<void>,
) {
	return useAppForm({
		defaultValues,
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: ({ value }) => save(value),
	});
}

export function useBrandingFooterForm(initialData: BrandingSettings) {
	const { save } = useBrandingSave();
	return useSectionForm(
		{ footerText: initialData.footerText },
		brandingFooterSchema,
		save,
	);
}

export function useBrandingColorsForm(initialData: BrandingSettings) {
	const { save } = useBrandingSave();
	return useSectionForm(
		{
			primaryColor: initialData.primaryColor,
			secondaryColor: initialData.secondaryColor,
		},
		brandingColorsSchema,
		save,
	);
}

export function useAuthBackgroundSection(initialData: BrandingSettings) {
	const { refresh, save } = useBrandingSave();
	const [authBackgroundUrl, setAuthBackgroundUrl] = useState(
		initialData.authBackgroundUrl,
	);
	const form = useSectionForm(
		{ authBgOverlay: initialData.authBgOverlay },
		brandingOverlaySchema,
		save,
	);
	const upload = useImageUpload(
		"Background image",
		uploadAuthBackgroundFn,
		deleteAuthBackgroundFn,
		setAuthBackgroundUrl,
		refresh,
	);
	return { form, authBackgroundUrl, upload };
}

export function useLogoGraphicsSection(initialData: BrandingSettings) {
	const { refresh, save } = useBrandingSave();
	const [logoUploadUrl, setLogoUploadUrl] = useState(initialData.logoUploadUrl);
	const [faviconUploadUrl, setFaviconUploadUrl] = useState(
		initialData.faviconUploadUrl,
	);
	const form = useSectionForm(
		{
			logoUrl: initialData.logoUrl,
			faviconUrl: initialData.faviconUrl,
			logoDarkInvert: initialData.logoDarkInvert,
		},
		brandingLogoSchema,
		save,
	);
	const logo = useImageUpload(
		"Logo",
		uploadBrandingLogoFn,
		deleteBrandingLogoFn,
		setLogoUploadUrl,
		refresh,
	);
	const favicon = useImageUpload(
		"Favicon",
		uploadBrandingFaviconFn,
		deleteBrandingFaviconFn,
		setFaviconUploadUrl,
		refresh,
	);
	return { form, logoUploadUrl, faviconUploadUrl, logo, favicon };
}

export type BrandingFooterFormApi = ReturnType<typeof useBrandingFooterForm>;
export type BrandingColorsFormApi = ReturnType<typeof useBrandingColorsForm>;
export type AuthBackgroundFormApi = ReturnType<
	typeof useAuthBackgroundSection
>["form"];
export type LogoGraphicsFormApi = ReturnType<
	typeof useLogoGraphicsSection
>["form"];

export type ImageUpload = ReturnType<typeof useImageUpload>;
