import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { plannerSettingsSchema } from "@/features/planner/validations";
import {
	type ConferenceSettings,
	conferenceSettingsQueryOptions,
	updateConferenceSettingsFn,
} from "@/features/settings/api/settings";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

export function usePlannerSettingsForm(initial: ConferenceSettings) {
	const queryClient = useQueryClient();
	const router = useRouter();

	const form = useAppForm({
		defaultValues: {
			dayStart: initial.dayStart,
			dayEnd: initial.dayEnd,
			defaultPresentationMin: initial.defaultPresentationMin,
			autoplanEnabled: initial.autoplanEnabled,
			authorBufferMin: initial.authorBufferMin,
			reminderLeadMin: initial.reminderLeadMin,
		},
		validators: {
			onChange: plannerSettingsSchema,
			onSubmit: plannerSettingsSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await updateConferenceSettingsFn({ data: value });
				await queryClient.invalidateQueries({
					queryKey: conferenceSettingsQueryOptions().queryKey,
				});
				await router.invalidate();
				toast.success("Planner settings saved");
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save"));
			}
		},
	});

	return { form };
}
