import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import {
	conferenceSettingsQueryOptions,
	updateConferenceSettingsFn,
} from "@/features/settings/api/settings";
import { conferenceSettingsSchema } from "@/features/settings/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

export function useConferenceSettings(initialData: ConferenceSettings) {
	const queryClient = useQueryClient();
	const router = useRouter();

	const form = useAppForm({
		defaultValues: initialData,
		validators: {
			onChange: conferenceSettingsSchema,
			onSubmit: conferenceSettingsSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await updateConferenceSettingsFn({ data: value });
				await queryClient.invalidateQueries({
					queryKey: conferenceSettingsQueryOptions().queryKey,
				});
				await router.invalidate();
				toast.success("Conference settings saved");
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save"));
			}
		},
	});

	return { form };
}

export type ConferenceFormApi = ReturnType<
	typeof useConferenceSettings
>["form"];
