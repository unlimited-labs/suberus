import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import {
	conferenceSettingsQueryOptions,
	updateConferenceSettingsFn,
} from "@/features/settings/api/settings";
import { getErrorMessage } from "@/shared/lib/error-message";

export function useConferenceSettings(initialData: ConferenceSettings) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);

	const handleChange = (
		field: keyof ConferenceSettings,
		value: string | number,
	) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const handleToggle = (field: keyof ConferenceSettings, checked: boolean) => {
		setData((prev) => ({ ...prev, [field]: checked }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateConferenceSettingsFn({ data });
			await queryClient.invalidateQueries({
				queryKey: conferenceSettingsQueryOptions().queryKey,
			});
			await router.invalidate();
			toast.success("Conference settings saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save"));
		} finally {
			setIsSaving(false);
		}
	};

	return { data, isSaving, handleChange, handleToggle, handleSave };
}

export type ConferenceSettingsHandleChange = (
	field: keyof ConferenceSettings,
	value: string | number,
) => void;

export type ConferenceSettingsHandleToggle = (
	field: keyof ConferenceSettings,
	checked: boolean,
) => void;
